import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';
import Image from 'next/image';

const STATUSES = ['paid','preparing','shipped','completed'] as const;

interface OrderRow { id: string; code: string; status: string; total: number; slipUrl?: string; customer?: { email?: string }; createdAt?: any }

export default function AdminOrdersPage() {
  const { role, loading } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (role !== 'owner') return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
    });
    return () => unsub();
  }, [role]);

  if (loading) return <div>Loading…</div>;
  if (role !== 'owner') return <div>Unauthorized</div>;

  const updateStatus = async (o: OrderRow, status: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: o.id, status })
      });
      toast.success('Status updated');
    } catch (e: any) {
      console.error(e);
      toast.error('Status update failed');
    }
  };

  const filtered = orders
    .filter(o => !filter || o.status === filter)
    .filter(o => {
      const t = q.trim().toLowerCase();
      if (!t) return true;
      return (
        (o.code || '').toLowerCase().includes(t) ||
        (o.customer?.email || '').toLowerCase().includes(t)
      );
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Orders</h1>
      <div className="flex gap-2 items-center flex-wrap">
        <select className="border rounded px-3 py-2" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="border rounded px-3 py-2 w-64" placeholder="Search code or customer email" value={q} onChange={e => setQ(e.target.value)} />
        <span className="text-sm text-gray-600">{filtered.length} total</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >Prev</button>
        <span>Page {currentPage} / {totalPages}</span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >Next</button>
      </div>
      <div className="bg-white rounded-md shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className='p-2 text-left'>No</th>
              <th className="p-2 text-left">Order Code</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2">Slip</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((o, idx) => (
              <tr key={o.id} className="border-t align-top">
                <td className="p-2 text-sm">{startIndex + idx + 1}</td>
                <td className="px-3 py-2 text-sm">
                  <a href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand hover:underline">{o.code}</a>
                </td>
                <td className="p-2">{o.status}</td>
                <td className="p-2 text-right">LKR {o.total?.toFixed?.(2) ?? o.total}</td>
                <td className="p-2">
                  {(() => {
                    const url = (o as any).slipPath || (o as any).slipUrl;
                    if (!url) return <span className="text-xs text-gray-500">None</span>;
                    return url.endsWith('.pdf') ? (
                      <a href={url} target="_blank" rel="noreferrer" className="text-brand">PDF</a>
                    ) : (
                      <div className="relative w-24 h-24 bg-gray-100 rounded">
                        <Image src={url} alt={o.code} fill className="object-cover rounded" />
                      </div>
                    );
                  })()}
                </td>
                <td className="p-2 w-48">
                  <select className="border rounded px-2 py-1 w-full mb-1" value={o.status} onChange={e => updateStatus(o, e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="text-xs text-brand" onClick={() => updateStatus(o, 'completed')}>Mark completed</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={5}>No orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
