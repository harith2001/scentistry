import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore - multer lacks bundled types in some environments without @types/multer
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyOwner } from '@/lib/serverAuth';
import { put } from '@vercel/blob';
import { strictWriteRateLimit } from '@/lib/rateLimit';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use memory storage; upload to Vercel Blob instead of local disk
const storage = multer.memoryStorage();

const allowed = ['.jpg', '.jpeg', '.png', '.webp'];

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB per image
  fileFilter: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true as any);
  }
}).single('image');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow CORS preflight and set CORS headers (preflight can be OPTIONS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await strictWriteRateLimit(req, res))) return; // limit image uploads
  const owner = await verifyOwner(req);
  if (!owner) return res.status(401).json({ error: 'Unauthorized' });

  upload(req as any, res as any, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    const file = (req as any).file as any;
    if (!file) return res.status(400).json({ error: 'No file received' });
    // Upload to Vercel Blob
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .slice(0, 40);
      const stamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const key = `products/${safeBase}_${stamp}_${rand}${ext}`;
      const result = await put(key, file.buffer, {
        access: 'public',
        contentType: file.mimetype || 'application/octet-stream',
      });
      return res.status(200).json({ url: result.url });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message || 'Blob upload failed' });
    }
  });
}
