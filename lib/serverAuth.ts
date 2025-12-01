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

    // Prefer Bearer ID token when present; fall back to cookie if needed.
    let decoded: any | null = null;
    if (bearer) {
      try {
        decoded = await adminAuth.verifyIdToken(bearer);
      } catch (e) {
        // If Bearer fails and cookie exists, try cookie as fallback
        if (cookieToken) {
          try {
            decoded = await adminAuth.verifySessionCookie(cookieToken, true);
          } catch (e2) {
            console.error('verifyOwner token checks failed', e, e2);
            return null;
          }
        } else {
          console.error('verifyOwner bearer verify failed', e);
          return null;
        }
      }
    } else if (cookieToken) {
      try {
        decoded = await adminAuth.verifySessionCookie(cookieToken, true);
      } catch (e) {
        console.error('verifyOwner cookie verify failed', e);
        return null;
      }
    }

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

    // Prefer Bearer ID token when present; fall back to cookie if needed.
    let decoded: any | null = null;
    if (bearer) {
      try {
        decoded = await adminAuth.verifyIdToken(bearer);
      } catch (e) {
        if (cookieToken) {
          try {
            decoded = await adminAuth.verifySessionCookie(cookieToken, true);
          } catch (e2) {
            console.error('verifyAny token checks failed', e, e2);
            return null;
          }
        } else {
          console.error('verifyAny bearer verify failed', e);
          return null;
        }
      }
    } else if (cookieToken) {
      try {
        decoded = await adminAuth.verifySessionCookie(cookieToken, true);
      } catch (e) {
        console.error('verifyAny cookie verify failed', e);
        return null;
      }
    }

    const roleSnap = await adminDb.collection('roles').doc(decoded.uid).get();
    const role = roleSnap.exists ? (roleSnap.data()?.role as string) : 'customer';
    return { uid: decoded.uid, role, email: decoded.email };
  } catch (e) {
    console.error('verifyAny failed', e);
    return null;
  }
}
