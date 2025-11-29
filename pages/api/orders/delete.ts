import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyOwner } from '@/lib/serverAuth';
import { strictWriteRateLimit } from '@/lib/rateLimit';
import path from 'path';
import fs from 'fs';

// Delete an order and its slip asset (blob or legacy file)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return; // rate limit destructive op
  if (!adminDb) return res.status(500).json({ error: 'Admin not initialized' });
  const auth = await verifyOwner(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });
    const data = snap.data() || {};

    const slipUrl = (data.slipUrl as string) || (data.slipPath as string) || '';

    // Delete the document first (so UI updates even if asset cleanup fails)
    await ref.delete();

    // Attempt to clean up slip asset if remote blob or local legacy file
    if (slipUrl) {
      try {
        if (slipUrl.startsWith('http')) {
          // Blob deletion API
          const token = process.env.BLOB_READ_WRITE_TOKEN;
          if (token) {
            await fetch('https://api.vercel.com/v2/blob/delete', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: slipUrl })
            }).catch(() => null);
          }
        } else {
          // Legacy local file path
          const p = path.join(process.cwd(), slipUrl.replace(/^\//, ''));
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      } catch (e) {
        console.warn('Slip asset cleanup failed', e);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Delete failed' });
  }
}
