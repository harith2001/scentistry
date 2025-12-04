import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendOrderStatusEmail } from '@/lib/email';
import { verifyOwner } from '@/lib/serverAuth';
import { onOrderStatusChanged } from '@/lib/analytics';
import { strictWriteRateLimit } from '@/lib/rateLimit';

// Basic API for updating order status and sending email.
// NOTE: For production secure with ID token verification and role lookup.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return; // rate limit status updates
  const auth = await verifyOwner(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { orderId, status } = req.body as { orderId?: string; status?: string };
    if (!orderId || !status) return res.status(400).json({ error: 'Missing orderId or status' });
    if (!adminDb) return res.status(500).json({ error: 'Admin not initialized' });

    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });
    const data = snap.data() || {};

    const oldStatus = (data.status as string) || '';
    await ref.update({ status, updatedAt: new Date().toISOString() });

    // Send email if customer email exists
    const email = (data.customer?.email as string) || '';
    const code = data.code as string;
    if (email) await sendOrderStatusEmail(email, code, status);
    const total = (data.total as number) || 0;
    await onOrderStatusChanged(oldStatus, status, total);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
