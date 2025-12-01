import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAny } from '@/lib/serverAuth';
import { put } from '@vercel/blob';
import { strictWriteRateLimit } from '@/lib/rateLimit';

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

      const orderRef = await dbAdmin.collection('orders').add({
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

      return res.status(200).json({ id: orderRef.id, code, slipUrl: blobUrl });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message || 'Failed to create order' });
    }
  });
}
