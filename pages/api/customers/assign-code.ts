import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAny } from '@/lib/serverAuth';
import { strictWriteRateLimit } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return; // limit customer code assignments
  if (!adminDb) return res.status(500).json({ error: 'Server not configured' });
  const dbAdmin = adminDb;

  const authInfo = await verifyAny(req).catch(() => null);
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: 'uid required' });

  try {
    const profileRef = dbAdmin.collection('profiles').doc(uid);
    const snap = await profileRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Profile not found' });

    const data = snap.data() as any;
    if (data.customerCode && /^\d+$/.test(String(data.customerCode))) {
      return res.status(200).json({ customerCode: String(data.customerCode) });
    }

    // Generate next numeric customer code based on counter collection
    const counterRef = dbAdmin.collection('counters').doc('customers');
    const { nextCode } = await dbAdmin.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const cSnap = await tx.get(counterRef);
      let seq = 1;
      if (cSnap.exists) {
        const cur = (cSnap.data()?.seq as number) || 0;
        seq = cur + 1;
      }
      tx.set(counterRef, { seq }, { merge: true });
      return { nextCode: seq };
    });

    await profileRef.set({ customerCode: String(nextCode) }, { merge: true });
    return res.status(200).json({ customerCode: String(nextCode) });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Failed to assign customer code' });
  }
}
