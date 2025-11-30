import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebaseAdmin';

// Set and clear a secure Firebase session cookie
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!adminAuth) return res.status(500).json({ error: 'Server not configured' });

  const secure = process.env.NODE_ENV === 'production';
  const cookieName = '__session';

  try {
    if (req.method === 'POST') {
      const { idToken, expiresInDays = 1 } = req.body || {};
      if (!idToken) return res.status(400).json({ error: 'idToken required' });
      const expiresIn = Math.min(Math.max(1, Number(expiresInDays)), 14) * 24 * 60 * 60 * 1000; // clamp 1-14 days

      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
      res.setHeader('Set-Cookie', `${cookieName}=${sessionCookie}; Max-Age=${Math.floor(expiresIn / 1000)}; Path=/; HttpOnly; SameSite=Lax; ${secure ? 'Secure;' : ''}`);
      return res.status(200).json({ status: 'ok' });
    }

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', `${cookieName}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; ${secure ? 'Secure;' : ''}`);
      return res.status(200).json({ status: 'cleared' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('session handler error', e);
    return res.status(500).json({ error: e?.message || 'Failed to manage session' });
  }
}
