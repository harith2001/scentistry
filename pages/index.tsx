import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [qText, setQText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(50)));
        setProducts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Product[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p: Product) => (
      (p.title || '').toLowerCase().includes(t) ||
      (p.size || p.sku || '').toLowerCase().includes(t) ||
      (p.scents || []).some((s: string) => s.toLowerCase().includes(t)) ||
      (p.moods || []).some((m: string) => m.toLowerCase().includes(t))
    ));
  }, [products, qText]);

  return (
    <div className="space-y-6">
      <section className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Scentistry Candles</h1>
        <p className="text-gray-600">Premium candles crafted by mood and scent.</p>
        <div className="max-w-xl mx-auto">
          <input
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Search by name, scent, mood, size"
            value={qText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQText(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <div className="text-center text-gray-500">Loading catalog…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-500">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
}
