import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export interface DecodedTokenWithRole {
  uid: string;
  role: string | null;
  email?: string | null;
}

export async function verifyOwner(req: any): Promise<DecodedTokenWithRole | null> {
  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = req.cookies?.__session || null;
    if ((!bearer && !cookieToken) || !adminAuth || !adminDb) return null;
    const decoded = cookieToken
      ? await adminAuth.verifySessionCookie(cookieToken, true)
      : await adminAuth.verifyIdToken(bearer as string);
    const roleSnap = await adminDb.collection('roles').doc(decoded.uid).get();
    const role = roleSnap.exists ? (roleSnap.data()?.role as string) : 'customer';
    if (role !== 'owner') return null;
    return { uid: decoded.uid, role, email: decoded.email };
  } catch (e) {
    console.error('verifyOwner failed', e);
    return null;
  }
}

export async function verifyAny(req: any): Promise<DecodedTokenWithRole | null> {
  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = req.cookies?.__session || null;
    if ((!bearer && !cookieToken) || !adminAuth || !adminDb) return null;
    const decoded = cookieToken
      ? await adminAuth.verifySessionCookie(cookieToken, true)
      : await adminAuth.verifyIdToken(bearer as string);
    const roleSnap = await adminDb.collection('roles').doc(decoded.uid).get();
    const role = roleSnap.exists ? (roleSnap.data()?.role as string) : 'customer';
    return { uid: decoded.uid, role, email: decoded.email };
  } catch (e) {
    console.error('verifyAny failed', e);
    return null;
  }
}
