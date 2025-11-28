import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore - multer lacks bundled types in some environments without @types/multer
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyOwner } from '@/lib/serverAuth';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  // Using broad 'any' typing to avoid missing type declarations without @types packages
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 40);
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${safeBase}_${stamp}_${rand}${ext}`);
  }
});

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const owner = await verifyOwner(req);
  if (!owner) return res.status(401).json({ error: 'Unauthorized' });

  upload(req as any, res as any, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    const file = (req as any).file as any;
    if (!file) return res.status(400).json({ error: 'No file received' });
    const relativePath = `/uploads/${file.filename}`;
    return res.status(200).json({ path: relativePath });
  });
}
