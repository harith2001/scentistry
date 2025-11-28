import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

interface Row { id: string; code: string; status: string; total: number; createdAt?: any }

export default function OrdersListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    // Primary: orders linked to authenticated userId
    const qByUid = query(collection(db, 'orders'), where('userId', '==', user.uid));
    // Fallback: orders by email in case some orders were created as guest
    // Remove email-based query to align with Firestore rules (read by userId only)
    const qByEmail = null;

    const unsubs: Array<() => void> = [];
    const ids = new Set<string>();
    const aggregate: any[] = [];

    const pushDocs = (docs: any[]) => {
      for (const d of docs) {
        if (!ids.has(d.id)) {
          ids.add(d.id);
          aggregate.push(d);
        }
      }
      // sort by createdAt desc if present
      aggregate.sort((a, b) => {
        const ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
        const tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setRows(aggregate as any);
    };

    const unsubUid = onSnapshot(
      qByUid,
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        pushDocs(docs);
      },
      (err) => {
        console.error('Orders by userId error:', err);
      }
    );
    unsubs.push(unsubUid);

    // No email listener; Firestore rules allow reads only when resource.userId == auth.uid

    return () => {
      for (const u of unsubs) u();
    };
  }, [user]);

  if (loading) return <div>Loading…</div>;
  if (!user) return <div>Please login to view your orders.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Your Orders</h1>
      <div className="bg-white rounded-md shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Order Code</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.code}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-right">LKR {r.total?.toFixed?.(2) ?? r.total}</td>
                <td className="p-3"><Link className="text-brand" href={`/orders/${r.id}`}>View</Link></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={4}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
