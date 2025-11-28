import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

export default function AdminAnalyticsPage() {
  const { role, loading } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customersCount, setCustomersCount] = useState<number>(0);

  useEffect(() => {
    const run = async () => {
      if (role !== 'owner') return;
      try {
        // Live orders snapshot for real-time analytics
        const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(qOrders, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setOrders(data);
          // derive summary
          const totalOrders = data.length;
          const revenueTotal = data.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const revenueCompleted = data.filter((o) => o.status === 'completed').reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const statusCounts: Record<string, number> = {};
          for (const o of data) {
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
          }
          setSummary({ totalOrders, revenueTotal, revenueCompleted, statusCounts });
        });

        const qLow = query(collection(db, 'products'), where('stock', '<', 5));
        const lowSnap = await getDocs(qLow);
        setLowStock(lowSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));

        // Customers count box
        try {
          const profilesCol = collection(db, 'profiles');
          const countSnap = await getCountFromServer(profilesCol);
          setCustomersCount(countSnap.data().count || 0);
        } catch {}
      } catch (e) { console.error(e); }
    };
    run();
    return () => {
      // cleanup handled in inner unsub captured via closure if needed
    };
  }, [role]);

  const statusCounts = useMemo(() => {
    const sc = (summary?.statusCounts || {}) as Record<string, number>;
    const order = ['paid','preparing','shipped','completed'];
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
          <div className="text-2xl font-semibold">{summary ? `LKR ${summary.revenueTotal?.toFixed?.(2)}` : '-'}</div>
        </div>
        <div className="bg-white rounded-md p-4 shadow-sm">
          <div className="text-sm text-gray-600">Revenue (Completed)</div>
          <div className="text-2xl font-semibold">{summary ? `LKR ${summary.revenueCompleted?.toFixed?.(2)}` : '-'}</div>
        </div>
        <a href="/admin/customers" className="bg-white rounded-md p-4 shadow-sm hover:bg-brand/5 transition">
          <div className="text-sm text-gray-600">Customers</div>
          <div className="text-2xl font-semibold">{customersCount}</div>
          <div className="text-xs text-brand mt-1">View all customers</div>
        </a>
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
