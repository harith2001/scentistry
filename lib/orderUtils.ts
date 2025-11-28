export function generateOrderCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = now.getFullYear().toString().slice(-2);
  const code = `${y}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  return code;
}

export const ALLOWED_SLIP_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
export const MAX_SLIP_SIZE = 10 * 1024 * 1024; // 10MB
