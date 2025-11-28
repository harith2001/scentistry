import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyOwner } from '@/lib/serverAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!adminDb) return res.status(500).json({ error: 'Admin not initialized' });
  const auth = await verifyOwner(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId } = req.body as { productId?: string };
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    await adminDb.collection('products').doc(productId).delete();
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
