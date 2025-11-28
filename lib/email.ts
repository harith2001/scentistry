import sendgrid from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@example.com';
const ownerEmail = process.env.OWNER_EMAIL || fromEmail;

if (apiKey) {
  sendgrid.setApiKey(apiKey);
}

export async function sendOrderStatusEmail(to: string, orderCode: string, status: string) {
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY missing, skipping email send');
    return;
  }
  const subj = `Your Scentistry order ${orderCode} status updated to ${status}`;
  const body = `Hello,\n\nYour order (${orderCode}) status is now: ${status}.\nWe will keep you updated.\n\nThank you for choosing Scentistry.`;
  await sendgrid.send({ to, from: fromEmail, subject: subj, text: body });
}

export async function sendOrderCreatedEmail(to: string, orderCode: string) {
  if (!apiKey) return;
  const subj = `Scentistry order received (${orderCode})`;
  const body = `Hello,\n\nWe have received your order (${orderCode}). It is currently pending payment verification.\nPlease ensure the bank transfer remark includes the order code.\n\nThank you!`;
  await sendgrid.send({ to, from: fromEmail, subject: subj, text: body });
}

export async function sendLowStockEmail(productTitle: string, stock: number) {
  if (!apiKey) return;
  const subj = `Low stock alert: ${productTitle} (${stock} left)`;
  const body = `Inventory notice:\n\nProduct: ${productTitle}\nRemaining stock: ${stock}\nThreshold reached. Consider restocking.\n\nScentistry Auto Alert`;
  await sendgrid.send({ to: ownerEmail, from: fromEmail, subject: subj, text: body });
}
