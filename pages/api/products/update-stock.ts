import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyOwner } from '@/lib/serverAuth';
import { sendLowStockEmail } from '@/lib/email';

const LOW_STOCK_THRESHOLD = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!adminDb) return res.status(500).json({ error: 'Admin not initialized' });
  const auth = await verifyOwner(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId, delta, absolute } = req.body as { productId?: string; delta?: number; absolute?: number };
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    const ref = adminDb.collection('products').doc(productId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Product not found' });
    const data = snap.data() || {} as any;
    const currentStock = data.stock || 0;
    let newStock = currentStock;
    if (typeof absolute === 'number') newStock = absolute; else if (typeof delta === 'number') newStock = currentStock + delta;
    newStock = Math.max(0, newStock);
    await ref.update({ stock: newStock, updatedAt: new Date().toISOString() });

    if (newStock < LOW_STOCK_THRESHOLD && currentStock >= LOW_STOCK_THRESHOLD) {
      await sendLowStockEmail(data.title || productId, newStock);
    }

    return res.status(200).json({ ok: true, stock: newStock });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
