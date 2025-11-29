import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAny } from '@/lib/serverAuth';
import { standardRateLimit } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await standardRateLimit(req, res))) return; // rate limit code reservation
  if (!adminDb) return res.status(500).json({ error: 'Server not configured' });
  const dbAdmin = adminDb;

  // Optional auth verification; allow public to fetch next code for payment remarks
  try {
    await verifyAny(req).catch(() => null);
  } catch {}

  try {
    // Determine next order number by looking at existing orders
    const snap = await dbAdmin
      .collection('orders')
      .orderBy('code', 'desc')
      .limit(1)
      .get();

    let nextSeq = 1;
    if (!snap.empty) {
      const lastCode: string = (snap.docs[0].data().code as string) || 'SC-0000000';
      const m = lastCode.match(/SC-(\d{7})/);
      const lastNum = m ? parseInt(m[1], 10) : 0;
      nextSeq = lastNum + 1;
    }

    const code = `SC-${String(nextSeq).padStart(7, '0')}`;

    // Optionally persist the latest sequence for visibility (best-effort)
    try {
      await dbAdmin.collection('counters').doc('orders').set({ seq: nextSeq }, { merge: true });
    } catch {}

    return res.status(200).json({ code, seq: nextSeq });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Failed to reserve next order code' });
  }
}
