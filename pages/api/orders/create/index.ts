import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAny } from '@/lib/serverAuth';
import { put } from '@vercel/blob';
import { strictWriteRateLimit } from '@/lib/rateLimit';
import { sendLowStockEmail } from '@/lib/email';

export const config = { api: { bodyParser: false } };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const ok = ['.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ok.includes(ext)) return cb(new Error('Unsupported file type'));
    cb(null, true as any);
  }
}).single('slip');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return;
  if (!adminDb) return res.status(500).json({ error: 'Server not configured for admin database access' });
  const dbAdmin = adminDb;

  const authInfo = await verifyAny(req);

  upload(req as any, res as any, async (err: any) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });

    try {
      const file = (req as any).file as any;
      if (!file) return res.status(400).json({ error: 'Slip is required' });

      const body = (req as any).body as any;
      const items = JSON.parse(body.items || '[]');
      const total = parseFloat(body.total || '0');
      const customer = JSON.parse(body.customer || '{}');
      const gift = JSON.parse(body.gift || '{}');

      // Guard: block orders if authenticated user is marked inactive
      if (authInfo?.uid) {
        try {
          const profileSnap = await dbAdmin.collection('profiles').doc(authInfo.uid).get();
          if (profileSnap.exists) {
            const pdata = profileSnap.data() as any;
            if (pdata && pdata.isActive === false) {
              return res.status(403).json({ error: 'Account is inactive. Please contact support.' });
            }
          }
        } catch (e) {
          // On read failure, be conservative and allow; log for diagnostics
          console.error('Failed to read profile for inactivity check', e);
        }
      } else {
        // Guest safety: if the provided customer email/phone belongs to an inactive profile, block order
        try {
          const profilesCol = dbAdmin.collection('profiles');
          const email = (customer?.email || '').trim();
          const phone = (customer?.phone || '').trim();
          let foundInactive = false;
          if (email) {
            const q = await profilesCol.where('email', '==', email).limit(1).get();
            if (!q.empty) {
              const pdata = q.docs[0].data() as any;
              if (pdata && pdata.isActive === false) foundInactive = true;
            }
          }
          if (!foundInactive && phone) {
            const q = await profilesCol.where('phone', '==', phone).limit(1).get();
            if (!q.empty) {
              const pdata = q.docs[0].data() as any;
              if (pdata && pdata.isActive === false) foundInactive = true;
            }
          }
          if (foundInactive) {
            return res.status(403).json({ error: 'This profile is inactive. Please log in and contact support.' });
          }
        } catch (e) {
          console.error('Guest inactive profile check failed', e);
          // Do not block for transient read errors; continue
        }
      }

      let code: string | undefined = body.code;
      if (!code) {
        const counterRef = dbAdmin.collection('counters').doc('orders');
        const result = await dbAdmin.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
          const snap = await tx.get(counterRef);
          let next = 1;
          if (snap.exists) {
            const cur = (snap.data()?.seq as number) || 0;
            next = cur + 1;
          }
          tx.set(counterRef, { seq: next }, { merge: true });
          const code = `SC-${String(next).padStart(7, '0')}`;
          return { seq: next, code };
        });
        code = result.code;
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const key = `slips/${code}${ext}`;
      const result = await put(key, file.buffer, {
        access: 'public',
        allowOverwrite: true, // keep filename as order code; replace if it already exists
        contentType: file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream')
      });
      const blobUrl = result.url;
      // Atomically decrement stock for each product and create the order
      const LOW_STOCK_THRESHOLD = 5;
      const ordersCol = dbAdmin.collection('orders');
      const orderDocRef = ordersCol.doc();

      const lowStockAlerts: Array<{ title: string; stock: number }> = [];

      await dbAdmin.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
        // Decrement stock per item
        for (const item of (items || [])) {
          const pid = item?.id;
          const qty = Number(item?.qty || 0);
          if (!pid || qty <= 0) continue;
          const pref = dbAdmin.collection('products').doc(pid);
          const psnap = await tx.get(pref);
          if (!psnap.exists) continue;
          const pdata = (psnap.data() || {}) as any;
          const currentStock = Number(pdata.stock || 0);
          const newStock = Math.max(0, currentStock - qty);
          tx.update(pref, { stock: newStock, updatedAt: new Date().toISOString() });
          // Track low stock transitions for post-transaction alerts
          if (newStock < LOW_STOCK_THRESHOLD && currentStock >= LOW_STOCK_THRESHOLD) {
            lowStockAlerts.push({ title: pdata.title || pid, stock: newStock });
          }
        }

        // Create the order document
        tx.set(orderDocRef, {
          userId: authInfo?.uid || null,
          items,
          total,
          customer,
          gift,
          slipUrl: blobUrl,
          slipPath: blobUrl,
          code,
          status: 'paid',
          createdAt: new Date(),
        });
      });

      // Send low stock alerts after transaction completes
      //await Promise.all(lowStockAlerts.map((a) => sendLowStockEmail(a.title, a.stock).catch(() => undefined)));

      return res.status(200).json({ id: orderDocRef.id, code, slipUrl: blobUrl });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message || 'Failed to create order' });
    }
  });
}
