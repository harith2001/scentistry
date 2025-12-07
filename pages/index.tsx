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

  const categorized = useMemo(() => {
    const hasValidDiscount = (p: any) => typeof p.discountedPrice === 'number' && p.discountedPrice > 0 && p.discountedPrice < p.price;
    const isSeasonSpecial = (p: Product) => {
      const title = (p.title || '').toLowerCase();
      const moods = (p.moods || []).map(m => m.toLowerCase());
      // Heuristics: title or mood includes season/seasonal
      return title.includes('season') || title.includes('seasonal') || moods.some(m => m.includes('season'));
    };

    const scented = filtered.filter(p => (p.scents || []).length > 0);
    const unscented = filtered.filter(p => (p.scents || []).length === 0);
    const discount = filtered.filter(p => hasValidDiscount(p as any));
    const limited = filtered.filter(p => !!p.limitedEdition);
    const season = filtered.filter(p => isSeasonSpecial(p));

    return { season, scented, unscented, discount, limited };
  }, [filtered]);

  return (
    <div className="space-y-8">
      <Hero />

      <section className="text-center space-y-4">
        <SectionHeading title="Our Collection" subtitle="Refined scents for a calm, minimalist lifestyle." />
        <div className="max-w-4xl mx-auto">
          <input
            className="w-full border border-gold/30 rounded-2xl px-4 py-3 bg-white hover:bg-gold/10 transition-colors focus:outline-none focus:ring-0 focus:border-gold/60 shadow-soft"
            placeholder="Search by name, scent, mood, size"
            value={qText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQText(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-2 justify-center">
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
      </section>

      {loading ? (
        <div className="text-center text-black/60">Loading Home</div>
      ) : (
        <>
          {/* Season Special */}
          <section className="space-y-4">
            <SectionHeading title="Season Special" subtitle="Limited-time selections inspired by the season." />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {categorized.season.map(p => (<ProductCard key={`season-${p.id}`} product={p} />))}
              {categorized.season.length === 0 && (
                <div className="col-span-full text-center text-black/60">No season specials available.</div>
              )}
            </div>
          </section>

          {/* Scented candles */}
          <section className="space-y-4">
            <SectionHeading title="Scented Candles" subtitle="Fragrant blends for mood and ambiance." />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {categorized.scented.map(p => (<ProductCard key={`scented-${p.id}`} product={p} />))}
              {categorized.scented.length === 0 && (
                <div className="col-span-full text-center text-black/60">No scented candles found.</div>
              )}
            </div>
          </section>

          {/* Unscented candles */}
          <section className="space-y-4">
            <SectionHeading title="Unscented Candles" subtitle="Minimal, clean burn — perfect for calm spaces." />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {categorized.unscented.map(p => (<ProductCard key={`unscented-${p.id}`} product={p} />))}
              {categorized.unscented.length === 0 && (
                <div className="col-span-full text-center text-black/60">No unscented candles found.</div>
              )}
            </div>
          </section>

          {/* Discount candles */}
          <section className="space-y-4">
            <SectionHeading title="Discount Candles" subtitle="Special prices, same refined quality." />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {categorized.discount.map(p => (<ProductCard key={`discount-${p.id}`} product={p} />))}
              {categorized.discount.length === 0 && (
                <div className="col-span-full text-center text-black/60">No discounted candles right now.</div>
              )}
            </div>
          </section>

          {/* Limited edition candles */}
          <section className="space-y-4">
            <SectionHeading title="Limited Edition" subtitle="Small-batch releases — available while stocks last." />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {categorized.limited.map(p => (<ProductCard key={`limited-${p.id}`} product={p} />))}
              {categorized.limited.length === 0 && (
                <div className="col-span-full text-center text-black/60">No limited editions at the moment.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
