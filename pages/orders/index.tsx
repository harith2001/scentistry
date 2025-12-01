import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';

interface Row { id: string; code: string; status: string; total: number; createdAt?: any }

export default function OrdersListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Primary: orders linked to authenticated userId
    const qByUid = query(collection(db, 'orders'), where('userId', '==', user.uid));
    
    const unsubs: Array<() => void> = [];

    const unsubUid = onSnapshot(
      qByUid,
      
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        items.sort((a, b) => {
          const ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
          const tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        setRows(items as any);
      },
      (err) => {
        console.error('Orders by userId error:', err);
      }
    );
    unsubs.push(unsubUid);

    return () => {
      for (const u of unsubs) u();
    };
  }, [user]);

  if (loading) return <div>Loading…</div>;
  if (!user) return <div>Please login to view your orders.</div>;

  const requestDelete = (id: string) => setConfirmDeleteId(id);
  const cancelDelete = () => setConfirmDeleteId(null);
  const performDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'orders', confirmDeleteId));
      toast.success('Order deleted');
    } catch (e) {
      console.error('Delete failed', e);
      toast.error('Failed to delete order');
      // Optionally surface a UI message here
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

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
                <td className="p-3 flex items-center gap-3">
                  <Link className="text-brand" href={`/orders/${r.id}`}>View</Link>
                  <button
                    type="button"
                    onClick={() => requestDelete(r.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={4}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {confirmDeleteId && (() => {
        const o = rows.find(x => x.id === confirmDeleteId);
        if (!o) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-sm rounded shadow-lg p-5 space-y-4 animate-fade-in">
              <h2 className="text-lg font-semibold">Delete Order</h2>
              <p className="text-sm text-gray-700">Are you sure you want to delete <span className="font-mono font-semibold">{o.code}</span>? This action cannot be undone.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={cancelDelete} className="px-4 py-2 text-sm border rounded" disabled={deleting}>Cancel</button>
                <button onClick={performDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded disabled:opacity-60" disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
