import { adminDb } from '@/lib/firebaseAdmin';

const ANALYTICS_DOC = 'summary';

interface AnalyticsData {
  totalOrders: number;
  revenueTotal: number;
  revenueCompleted: number;
  statusCounts: Record<string, number>;
}

async function getDefault(): Promise<AnalyticsData> {
  return { totalOrders: 0, revenueTotal: 0, revenueCompleted: 0, statusCounts: {} };
}

export async function onOrderCreated(status: string, total: number) {
  const db = adminDb;
  if (!db) return;
  await db.runTransaction(async (tx) => {
    const ref = db.collection('analytics').doc(ANALYTICS_DOC);
    const snap = await tx.get(ref);
    const data: AnalyticsData = snap.exists ? (snap.data() as any) : await getDefault();
    data.totalOrders += 1;
    data.revenueTotal += total;
    data.statusCounts[status] = (data.statusCounts[status] || 0) + 1;
    tx.set(ref, data, { merge: true });
  });
}

export async function onOrderStatusChanged(oldStatus: string, newStatus: string, total: number) {
  const db = adminDb;
  if (!db) return;
  await db.runTransaction(async (tx) => {
    const ref = db.collection('analytics').doc(ANALYTICS_DOC);
    const snap = await tx.get(ref);
    const data: AnalyticsData = snap.exists ? (snap.data() as any) : await getDefault();
    if (oldStatus) {
      data.statusCounts[oldStatus] = Math.max(0, (data.statusCounts[oldStatus] || 0) - 1);
    }
    data.statusCounts[newStatus] = (data.statusCounts[newStatus] || 0) + 1;
    if (newStatus === 'completed') {
      data.revenueCompleted += total;
    }
    tx.set(ref, data, { merge: true });
  });
}
