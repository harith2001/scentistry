import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import AdminProductForm from '@/components/AdminProductForm';
import { Product } from '@/types';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const { role, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [limitedOnly, setLimitedOnly] = useState(false);

  useEffect(() => {
    if (role !== 'owner') return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
    });
    return () => unsub();
  }, [role]);

  if (loading) return <div>Loading…</div>;
  if (role !== 'owner') return <div>Unauthorized</div>;

  const bulkChangeStock = async (id: string, delta: number) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/products/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ productId: id, delta })
      });
      if (!resp.ok) throw new Error(await resp.text());
    } catch (e: any) {
      console.error(e);
      toast.error('Stock update failed');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ productId: id })
      });
      if (!resp.ok) throw new Error(await resp.text());
    } catch (e: any) {
      console.error(e);
      toast.error('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <button onClick={() => { setShowCreate(s => !s); setEditing(null); }} className="bg-brand text-white px-4 py-2 rounded">
          {showCreate ? 'Close' : 'New Product'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input className="border rounded px-3 py-2 w-64" placeholder="Search title, SKU, scent, mood" value={q} onChange={e => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={limitedOnly} onChange={e => setLimitedOnly(e.target.checked)} /> Limited only
        </label>
        <span className="text-sm text-gray-600">{products.length} total</span>
      </div>

      {showCreate && (
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h2 className="font-medium mb-3">Create Product</h2>
          <AdminProductForm onDone={() => setShowCreate(false)} />
        </div>
      )}

      {editing && (
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h2 className="font-medium mb-3">Edit Product</h2>
          <AdminProductForm existing={editing} onDone={() => setEditing(null)} />
        </div>
      )}

      <div className="bg-white rounded-md shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Stock</th>
              <th className="p-2">Limited</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products
              .filter(p => !limitedOnly || p.limitedEdition)
              .filter(p => {
                const t = q.trim().toLowerCase();
                if (!t) return true;
                return (
                  (p.title || '').toLowerCase().includes(t) ||
                  (p.sku || '').toLowerCase().includes(t) ||
                  (p.scents || []).some(s => s.toLowerCase().includes(t)) ||
                  (p.moods || []).some(m => m.toLowerCase().includes(t))
                );
              })
              .map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.title}</td>
                <td className="p-2 text-right">${p.price?.toFixed?.(2) ?? p.price}</td>
                <td className="p-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button className="px-2 py-1 border rounded" onClick={() => bulkChangeStock(p.id, -1)}>-</button>
                    <input
                      className="w-16 text-center border rounded py-1"
                      type="number"
                      value={p.stock}
                      onChange={e => bulkChangeStock(p.id, parseInt(e.target.value, 10) - (p.stock || 0))}
                    />
                    <button className="px-2 py-1 border rounded" onClick={() => bulkChangeStock(p.id, 1)}>+</button>
                  </div>
                </td>
                <td className="p-2 text-center">{p.limitedEdition ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <button className="text-brand text-xs" onClick={() => setEditing(p)}>Edit</button>
                    <button className="text-red-600 text-xs" onClick={() => setDeleting(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={5}>No products.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-md p-4 w-80">
            <div className="font-medium mb-2">Delete Product</div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this product? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => deleteProduct(deleting!)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
