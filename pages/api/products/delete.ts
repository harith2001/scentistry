import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyOwner } from '@/lib/serverAuth';
import { strictWriteRateLimit } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';
import { del } from '@vercel/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await strictWriteRateLimit(req, res))) return; // limit product deletions
  if (!adminDb) return res.status(500).json({ error: 'Admin not initialized' });
  const auth = await verifyOwner(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId } = req.body as { productId?: string };
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    // Fetch product to get image paths
    const ref = adminDb.collection('products').doc(productId);
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() as any) : null;

    // Delete Firestore doc first to avoid partial failure blocking UI
    await ref.delete();

    // Best-effort delete local uploaded images under public/uploads
    const images: string[] = Array.isArray(data?.images) ? data!.images : [];
    for (const img of images) {
      try {
        if (typeof img !== 'string') continue;
        if (img.startsWith('http')) {
          // Blob URL deletion
          await del(img);
        } else if (img.startsWith('/uploads/')) {
          // Legacy local deletion
          const rel = img.replace(/^\//, '');
          const full = path.join(process.cwd(), 'public', rel);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      } catch (err) {
        // Ignore individual file deletion errors; log for visibility
        console.warn('Failed to delete image', img, err);
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
