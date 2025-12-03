import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';
import Hero from '@/components/Hero';
import SectionHeading from '@/components/ui/SectionHeading';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [qText, setQText] = useState('');
  const [sortMode, setSortMode] = useState<'none' | 'price-asc' | 'price-desc' | 'discount-only'>('none');
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
    let list = products.filter((p: Product) => (
      (p.title || '').toLowerCase().includes(t) ||
      (p.size || p.sku || '').toLowerCase().includes(t) ||
      (p.scents || []).some((s: string) => s.toLowerCase().includes(t)) ||
      (p.moods || []).some((m: string) => m.toLowerCase().includes(t))
    ));
    if (!t) list = products;

    // Apply discount-only filter
    if (sortMode === 'discount-only') {
      list = list.filter((p) => typeof (p as any).discountedPrice === 'number' && (p as any).discountedPrice! > 0 && (p as any).discountedPrice! < p.price);
    }

    // Sort by price
    if (sortMode === 'price-asc') {
      list = [...list].sort((a, b) => {
        const ap = typeof (a as any).discountedPrice === 'number' && (a as any).discountedPrice! > 0 && (a as any).discountedPrice! < a.price ? (a as any).discountedPrice! : a.price;
        const bp = typeof (b as any).discountedPrice === 'number' && (b as any).discountedPrice! > 0 && (b as any).discountedPrice! < b.price ? (b as any).discountedPrice! : b.price;
        return ap - bp;
      });
    } else if (sortMode === 'price-desc') {
      list = [...list].sort((a, b) => {
        const ap = typeof (a as any).discountedPrice === 'number' && (a as any).discountedPrice! > 0 && (a as any).discountedPrice! < a.price ? (a as any).discountedPrice! : a.price;
        const bp = typeof (b as any).discountedPrice === 'number' && (b as any).discountedPrice! > 0 && (b as any).discountedPrice! < b.price ? (b as any).discountedPrice! : b.price;
        return bp - ap;
      });
    }

    return list;
  }, [products, qText, sortMode]);

  return (
    <div className="space-y-8">
      <Hero />

      <section className="text-center space-y-4">
        <SectionHeading title="Our Collection" subtitle="Refined scents for a calm, minimalist lifestyle." />
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <input
              className="flex-1 border border-gold/30 rounded-2xl px-4 py-3 bg-white hover:bg-gold/10 transition-colors focus:outline-none focus:ring-0 focus:border-gold/60 shadow-soft"
              placeholder="Search by name, scent, mood, size"
              value={qText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-black/70">Sort:</label>
              <select
                className="border border-gold/30 rounded-2xl px-3 py-2 bg-white hover:bg-gold/10 transition-colors min-w-[12rem]"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
              >
                <option value="none">Default</option>
                <option value="price-asc">Lowest price</option>
                <option value="price-desc">Highest price</option>
                <option value="discount-only">Discounted products</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-center text-black/60">Loading Home</div>
      ) : (
        <div id="products" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-black/60">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
}
