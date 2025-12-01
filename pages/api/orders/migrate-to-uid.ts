import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAny } from '@/lib/serverAuth';
import { strictWriteRateLimit } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return;
  if (!adminDb) return res.status(500).json({ error: 'Server not configured' });

  try {
    const auth = await verifyAny(req);
    if (!auth?.uid) return res.status(401).json({ error: 'Unauthorized' });
    const email = (auth.email || '').trim();
    if (!email) return res.status(400).json({ error: 'No email on account' });

    const db = adminDb;
    const targets: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = [];

    // Query by exact email; try original and lowercased to catch most cases
    const emailsToTry = Array.from(new Set([email, email.toLowerCase()]));
    for (const e of emailsToTry) {
      const qs = await db.collection('orders')
        .where('customer.email', '==', e)
        .get();
      for (const doc of qs.docs) targets.push(doc);
    }

    // Filter docs needing migration (no userId yet)
    const toUpdate = targets.filter(d => {
      const data = d.data() as any;
      const uid = data.userId;
      return !uid; // only migrate guest orders (no userId)
    });

    if (toUpdate.length === 0) return res.status(200).json({ migrated: 0 });

    // Batch update
    let migrated = 0;
    while (toUpdate.length) {
      const chunk = toUpdate.splice(0, 400); // keep below batch limit
      const batch = db.batch();
      for (const doc of chunk) {
        batch.update(doc.ref, { userId: auth.uid, updatedAt: new Date().toISOString() });
      }
      await batch.commit();
      migrated += chunk.length;
    }

    return res.status(200).json({ migrated });
  } catch (e: any) {
    console.error('migrate-to-uid error', e);
    return res.status(500).json({ error: e?.message || 'Migration failed' });
  }
}
