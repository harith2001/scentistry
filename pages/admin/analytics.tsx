import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

export default function AdminAnalyticsPage() {
  const { role, loading } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      if (role !== 'owner') return;
      try {
        const ref = doc(db, 'analytics', 'summary');
        const snap = await getDoc(ref);
        setSummary(snap.exists() ? snap.data() : null);

        const qLow = query(collection(db, 'products'), where('stock', '<', 5));
        const lowSnap = await getDocs(qLow);
        setLowStock(lowSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) { console.error(e); }
    };
    run();
  }, [role]);

  const statusCounts = useMemo(() => {
    const sc = (summary?.statusCounts || {}) as Record<string, number>;
    const order = ['pending_payment','paid','preparing','shipped','completed'];
    return order.map(s => ({ status: s, count: sc[s] || 0 }));
  }, [summary]);

  if (loading) return <div>Loading…</div>;
  if (role !== 'owner') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-md p-4 shadow-sm">
          <div className="text-sm text-gray-600">Total Orders</div>
          <div className="text-2xl font-semibold">{summary?.totalOrders ?? '-'}</div>
        </div>
        <div className="bg-white rounded-md p-4 shadow-sm">
          <div className="text-sm text-gray-600">Revenue (Total)</div>
          <div className="text-2xl font-semibold">{summary?.revenueTotal?.toFixed?.(2) ?? '-'}</div>
        </div>
        <div className="bg-white rounded-md p-4 shadow-sm">
          <div className="text-sm text-gray-600">Revenue (Completed)</div>
          <div className="text-2xl font-semibold">{summary?.revenueCompleted?.toFixed?.(2) ?? '-'}</div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm">
        <div className="font-medium mb-2">Orders by Status</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {statusCounts.map(s => (
            <div key={s.status} className="bg-gray-50 rounded p-3 text-center">
              <div className="text-xs text-gray-600">{s.status}</div>
              <div className="text-xl font-semibold">{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm">
        <div className="font-medium mb-2">Low Stock Items (&lt; 5)</div>
        <div className="space-y-2">
          {lowStock.map(p => (
            <div key={p.id} className="flex justify-between">
              <span>{p.title}</span>
              <span className="font-medium">{p.stock}</span>
            </div>
          ))}
          {lowStock.length === 0 && <div className="text-sm text-gray-500">None</div>}
        </div>
      </div>
    </div>
  );
}
