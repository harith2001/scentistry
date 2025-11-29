import type { NextApiRequest, NextApiResponse } from 'next';

interface Options {
  limit: number;            // max requests in window
  windowMs: number;         // window length in ms
  keyGenerator?: (req: NextApiRequest) => string;
}

interface Entry {
  count: number;
  expiresAt: number;
}

// Simple in-memory store. In production prefer Redis / Upstash for multi-instance.
const store = new Map<string, Entry>();

function defaultKey(req: NextApiRequest): string {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  const ip = xf.split(',')[0].trim() || (req.socket.remoteAddress || 'unknown');
  // group by path so one noisy endpoint doesn't block others (optional)
  return `${ip}:${req.url}`;
}

export async function rateLimit(req: NextApiRequest, res: NextApiResponse, opts: Options): Promise<boolean> {
  const { limit, windowMs, keyGenerator = defaultKey } = opts;
  const key = keyGenerator(req);
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.expiresAt < now) {
    // new window
    store.set(key, { count: 1, expiresAt: now + windowMs });
    setHeaders(res, limit, limit - 1, windowMs);
    return true;
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(0, Math.ceil((existing.expiresAt - now) / 1000));
    setHeaders(res, limit, 0, existing.expiresAt - now);
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return false;
  }

  existing.count += 1;
  store.set(key, existing);
  setHeaders(res, limit, limit - existing.count, existing.expiresAt - now);
  return true;
}

function setHeaders(res: NextApiResponse, limit: number, remaining: number, msUntilReset: number) {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + msUntilReset / 1000).toString());
}

// Convenience presets
export async function standardRateLimit(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  // 60 requests per minute per IP per endpoint
  return rateLimit(req, res, { limit: 60, windowMs: 60_000 });
}

export async function strictWriteRateLimit(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  // For write-heavy endpoints (create order, upload image)
  return rateLimit(req, res, { limit: 15, windowMs: 60_000 });
}
