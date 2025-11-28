import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

interface Row { id: string; code: string; status: string; total: number; createdAt?: any }

export default function OrdersListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
    });
    return () => unsub();
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
                <td className="p-3 text-right">${r.total?.toFixed?.(2) ?? r.total}</td>
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
