import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyOwner } from '@/lib/serverAuth';
import { strictWriteRateLimit } from '@/lib/rateLimit';

// Edit limited order fields (total, customer info, gift). Status has its own endpoint.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return; // rate limit edits
  if (!adminDb) return res.status(500).json({ error: 'Admin not initialized' });
  const auth = await verifyOwner(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { orderId, total, customer, gift } = req.body as { orderId?: string; total?: number; customer?: any; gift?: any };
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

    const update: any = { updatedAt: new Date().toISOString() };
    if (typeof total === 'number' && !Number.isNaN(total)) update.total = total;
    if (customer && typeof customer === 'object') update.customer = customer;
    if (gift && typeof gift === 'object') update.gift = gift;

    if (Object.keys(update).length === 1) return res.status(400).json({ error: 'No valid fields to update' });

    await ref.update(update);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Edit failed' });
  }
}
