import type { NextApiRequest, NextApiResponse } from 'next';

const REMOTE_URL = 'https://country-code-au6g.vercel.app/Country.json';

const FALLBACK_CODES: { code: string; label: string }[] = [
  { code: '+1', label: 'United States (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
];

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await fetch(REMOTE_URL, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`Upstream returned ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Invalid upstream payload');

    const mapped: { code: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const it of data) {
      const name = (it?.name as string) || (it?.country as string) || (it?.Country as string) || '';
      const rawDial = (it?.dial_code ?? it?.dialCode ?? it?.calling_code ?? it?.callingCode ?? it?.phone_code ?? it?.phoneCode ?? it?.code) as string | number | undefined;
      if (!rawDial) continue;
      let dial = String(rawDial).trim();
      if (!dial.startsWith('+')) dial = `+${dial.replace(/[^0-9]/g, '')}`;
      if (!/^\+[0-9]{1,4}$/.test(dial)) continue;
      const label = `${name || 'Country'} (${dial})`;
      if (seen.has(dial)) continue;
      seen.add(dial);
      mapped.push({ code: dial, label });
    }
    mapped.sort((a, b) => a.label.localeCompare(b.label));

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=600');
    res.status(200).json(mapped.length ? mapped : FALLBACK_CODES);
  } catch (e: any) {
    res.status(200).json(FALLBACK_CODES);
  }
}
