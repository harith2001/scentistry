import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb, getAdminInitStatus } from '@/lib/firebaseAdmin';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const status = getAdminInitStatus();
    // Attempt a trivial Firestore operation if initialized to confirm access
    let firestoreOk: boolean | undefined = undefined;
    if (status.initialized && adminDb) {
      try {
        await adminDb.collection('__health').limit(1).get();
        firestoreOk = true;
      } catch (e) {
        firestoreOk = false;
      }
    }
    return res.status(200).json({ ...status, firestoreOk });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Health check failed' });
  }
}