import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import Image from 'next/image';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'orders', id));
        if (snap.exists()) setOrder({ id: snap.id, ...(snap.data() as any) });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (!order) return <div>Order not found.</div>;

  const slipUrl: string | undefined = order.slipPath || order.slipUrl;
  const slipFileName = (() => {
    const p = slipUrl || '';
    try { return decodeURIComponent(p.split('/').pop() || ''); } catch { return p.split('/').pop() || ''; }
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order {order.code}</h1>
        <span className="text-sm bg-gray-100 px-2 py-1 rounded">{order.status}</span>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="font-medium mb-2">Items</div>
        <ul className="list-disc ml-5">
          {order.items?.map((i: any) => (
            <li key={i.id}>{i.title} × {i.qty} — ${(i.price * i.qty).toFixed(2)}</li>
          ))}
        </ul>
        <div className="mt-3 font-semibold">Total: ${order.total?.toFixed?.(2) ?? order.total}</div>
      </div>

      {slipUrl && (
        <div className="bg-white p-4 rounded-md shadow-sm">
          <div className="font-medium mb-2">Bank Slip</div>
          <div className="text-sm text-ink/70 mb-2">{slipFileName}</div>
          {slipUrl.endsWith('.pdf') ? (
            <a className="text-brand" href={slipUrl} target="_blank" rel="noreferrer">View PDF</a>
          ) : (
            <div className="relative w-full max-w-md aspect-[4/3] bg-gray-100 rounded overflow-hidden">
              {String(slipUrl).startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(slipUrl)} alt="Bank slip" className="w-full h-full object-contain" />
              ) : (
                <Image src={slipUrl} alt="Bank slip" fill className="object-contain" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
