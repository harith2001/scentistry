import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'orders', id));
        if (!snap.exists()) {
          setError('Order not found');
        } else {
          setOrder({ id: snap.id, ...snap.data() });
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const downloadPDF = () => {
    // Use the browser's print-to-PDF capability
    window.print();
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!order) return null;

  const slipUrl = order.slipPath || order.slipUrl || null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Order {order.code}</h1>

      <div className="bg-white rounded-md p-4 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="font-medium mb-2">Customer</div>
            <div className="text-sm space-y-1">
              <div>{order.customer?.fullName}</div>
              <div>{order.customer?.email}</div>
              <div>{order.customer?.phone}</div>
              <div>{order.customer?.address}</div>
              <div>{order.customer?.postalCode} {order.customer?.city}</div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Summary</div>
            <div className="text-sm space-y-1">
              <div>Status: {order.status}</div>
              <div>Total: LKR {Number(order.total || 0).toFixed(2)}</div>
              <div>Items: {Array.isArray(order.items) ? order.items.length : 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm">
        <div className="font-medium mb-2">Items</div>
        <div className="space-y-2 text-sm">
          {Array.isArray(order.items) && order.items.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>{i.title} × {i.qty}</span>
              <span>LKR {Number(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm">
        <div className="font-medium mb-2">Payment Slip</div>
        {slipUrl ? (
          slipUrl.endsWith('.pdf') ? (
            <a href={slipUrl} target="_blank" rel="noreferrer" className="text-brand">Open PDF</a>
          ) : (
            <img src={slipUrl} alt={order.code} className="w-64 h-64 object-cover rounded border" />
          )
        ) : (
          <div className="text-sm text-gray-600">No slip uploaded.</div>
        )}
        {slipUrl && (
          <div className="mt-3">
            <a href={slipUrl} download className="px-4 py-2 border rounded bg-white hover:bg-brand/10 text-ink">Download Slip</a>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={downloadPDF} className="px-4 py-2 border rounded bg-white hover:bg-brand/10 text-ink">Download Order PDF</button>
      </div>
    </div>
  );
}
