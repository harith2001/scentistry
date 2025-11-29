import { useEffect, useState, useRef } from 'react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    if (role !== 'owner') return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const prevStatuses = prevStatusesRef.current;
    const unsub = onSnapshot(q, (snap) => {
      const next = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any as OrderRow[];
      // Detect status changes vs previous snapshot
      const changes: { code: string; from: string; to: string }[] = [];
      next.forEach(o => {
        const prev = prevStatuses[o.id];
        if (prev && prev !== o.status) {
          changes.push({ code: o.code, from: prev, to: o.status });
        }
        // update ref map
        prevStatuses[o.id] = o.status;
      });
      setOrders(next);
      // Fire toasts for changes (skip initial load by requiring prev value)
      changes.forEach(c => {
        toast.success(`Order ${c.code} status: ${c.to}`);
      });
    });
    return () => unsub();
  }, [role]);

  // Track previous statuses across snapshots
  const prevStatusesRef = useRef<Record<string, string>>({});

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

  const startEdit = (o: OrderRow) => {
    setEditingId(o.id);
    setEditTotal(String(o.total ?? ''));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTotal('');
  };

  const saveEdit = async (o: OrderRow) => {
    try {
      const num = parseFloat(editTotal);
      if (Number.isNaN(num)) return toast.error('Invalid total');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/orders/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: o.id, total: num })
      });
      if (!res.ok) throw new Error('Edit failed');
      toast.success('Order updated');
      cancelEdit();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Update failed');
    }
  };

  const requestDelete = (o: OrderRow) => {
    setConfirmDeleteId(o.id);
  };

  const performDelete = async () => {
    if (!confirmDeleteId) return;
    const o = orders.find(x => x.id === confirmDeleteId);
    if (!o) { setConfirmDeleteId(null); return; }
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: o.id })
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`Order ${o.code} deleted`);
      if (editingId === o.id) cancelEdit();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Delete failed');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const cancelDelete = () => setConfirmDeleteId(null);

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
                      <div className="relative w-24 h-24 bg-gray-100 rounded overflow-hidden">
                        {String(url).startsWith('http') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={String(url)} alt={o.code} className="w-full h-full object-cover" />
                        ) : (
                          <Image src={url} alt={o.code} fill className="object-cover rounded" />
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-2 w-48">
                  <select className="border rounded px-2 py-1 w-full mb-1" value={o.status} onChange={e => updateStatus(o, e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="space-x-2 mb-2">
                    <button className="text-xs text-brand" onClick={() => updateStatus(o, 'completed')}>Complete</button>
                    {editingId !== o.id && (
                      <button className="text-xs text-blue-600" onClick={() => startEdit(o)}>Edit</button>
                    )}
                    <button className="text-xs text-red-600" onClick={() => requestDelete(o)}>Delete</button>
                  </div>
                  {editingId === o.id && (
                    <div className="space-y-1 border-t pt-2">
                      <label className="block text-xs text-gray-600">Total (LKR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTotal}
                        onChange={e => setEditTotal(e.target.value)}
                        className="border rounded px-2 py-1 w-full text-xs"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(o)} className="px-2 py-1 text-xs bg-brand text-white rounded">Save</button>
                        <button onClick={cancelEdit} className="px-2 py-1 text-xs border rounded">Cancel</button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={6}>No orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {confirmDeleteId && (() => {
        const o = orders.find(x => x.id === confirmDeleteId);
        if (!o) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-sm rounded shadow-lg p-5 space-y-4 animate-fade-in">
              <h2 className="text-lg font-semibold">Delete Order</h2>
              <p className="text-sm text-gray-700">Are you sure you want to delete <span className="font-mono font-semibold">{o.code}</span>? This action cannot be undone.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={cancelDelete} className="px-4 py-2 text-sm border rounded">Cancel</button>
                <button onClick={performDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
