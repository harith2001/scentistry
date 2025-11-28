import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';

interface CustomerRow { id: string; fullName?: string; email?: string; phone?: string; country?: string; isActive?: boolean; customerCode?: string }

export default function AdminCustomersPage() {
  const { role, loading } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (role !== 'owner') return;
    try {
      const qProfiles = query(collection(db, 'profiles'), orderBy('fullName'));
      const unsub = onSnapshot(
        qProfiles,
        (snap) => {
          setCustomers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
        },
        async (err) => {
          console.error('Customers snapshot error:', err);
          // Fallback: try without ordering in case of index/permission issues
          try {
            const unsubPlain = onSnapshot(collection(db, 'profiles'), (snap2) => {
              setCustomers(snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
            });
            // return cleanup to unsubscribe fallback listener
            return () => unsubPlain();
          } catch (e) {
            console.error('Customers fallback error:', e);
          }
        }
      );
      return () => unsub();
    } catch (e) {
      console.error('Customers init error:', e);
    }
  }, [role]);

  const filtered = useMemo(() => {
    const raw = q.trim();
    const t = raw.toLowerCase();
    return customers.filter(c => {
      if (!raw) return true;
      const name = (c.fullName || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const code = String(c.customerCode || '');
      return (
        name.includes(t) ||
        email.includes(t) ||
        phone.includes(t) ||
        code.includes(raw)
      );
    });
  }, [customers, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  const setActive = async (c: CustomerRow, active: boolean) => {
    await updateDoc(doc(db, 'profiles', c.id), { isActive: active });
  };
  const remove = async (c: CustomerRow) => {
    await deleteDoc(doc(db, 'profiles', c.id));
  };

  if (loading) return <div>Loading…</div>;
  if (role !== 'owner') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Customers</h1>
      <div className="flex gap-2 items-center flex-wrap">
        <input className="border rounded px-3 py-2 w-64" placeholder="Search name or customer code" value={q} onChange={e => setQ(e.target.value)} />
        <span className="text-sm text-gray-600">{filtered.length} total</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
        <span>Page {currentPage} / {totalPages}</span>
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
      </div>

      <div className="bg-white rounded-md shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">No</th>
              <th className="p-2 text-left">Customer Code</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c, idx) => (
              <tr key={c.id} className="border-t align-top">
                <td className="p-2">{startIndex + idx + 1}</td>
                <td className="p-2 font-mono">{c.customerCode || '-'}</td>
                <td className="p-2">{c.fullName || '-'}</td>
                <td className="p-2">{c.email || '-'}</td>
                <td className="p-2">{c.phone || '-'}</td>
                <td className="p-2">{c.isActive ? 'Active' : 'Inactive'}</td>
                <td className="p-2 w-64">
                  <div className="flex flex-wrap gap-2">
                    <button title="View" className="px-2 py-1 border rounded" onClick={() => location.href = `/admin/customers/${c.id}`}>👁️</button>
                    <button title="Edit" className="px-2 py-1 border rounded" onClick={() => location.href = `/admin/customers/${c.id}/edit`}>✏️</button>
                    {c.isActive ? (
                      <button title="Deactivate" className="px-2 py-1 border rounded" onClick={() => setActive(c, false)}>⏸️</button>
                    ) : (
                      <button title="Activate" className="px-2 py-1 border rounded" onClick={() => setActive(c, true)}>▶️</button>
                    )}
                    <button title="Delete" className="px-2 py-1 border rounded text-red-600" onClick={() => remove(c)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={7}>No customers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
