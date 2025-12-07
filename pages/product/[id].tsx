import { useRouter } from 'next/router';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useEffect, useState } from 'react';
import { Product } from '@/types';
import { useCart } from '@/lib/cartContext';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const { add } = useCart();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'products', id));
        if (snap.exists()) setProduct({ id: snap.id, ...(snap.data() as any) });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div>Loading product…</div>;
  if (!product) return <div>Product not found.</div>;
  const hasDiscount = typeof product.discountedPrice === 'number' && product.discountedPrice > 0 && product.discountedPrice < product.price;
  const effectivePrice = hasDiscount ? product.discountedPrice! : product.price;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="relative w-full aspect-square bg-black/[0.03] rounded-3xl overflow-hidden select-none border border-gold/15 shadow-soft">
          {/* Slides */}
          <div
            className="absolute inset-0 flex transition-transform duration-300"
            style={{ transform: `translateX(calc(${(-current) * 100}% + ${dragDelta}px))` }}
            onMouseDown={(e) => setDragStartX(e.clientX)}
            onMouseMove={(e) => {
              if (dragStartX !== null) setDragDelta(e.clientX - dragStartX);
            }}
            onMouseUp={() => {
              if (dragStartX !== null) {
                const threshold = 50;
                if (dragDelta > threshold && current > 0) setCurrent(current - 1);
                else if (dragDelta < -threshold && (product.images?.length ?? 0) > current + 1) setCurrent(current + 1);
              }
              setDragStartX(null);
              setDragDelta(0);
            }}
            onMouseLeave={() => {
              if (dragStartX !== null) {
                const threshold = 50;
                if (dragDelta > threshold && current > 0) setCurrent(current - 1);
                else if (dragDelta < -threshold && (product.images?.length ?? 0) > current + 1) setCurrent(current + 1);
              }
              setDragStartX(null);
              setDragDelta(0);
            }}
            onTouchStart={(e) => setDragStartX(e.touches[0].clientX)}
            onTouchMove={(e) => {
              if (dragStartX !== null) setDragDelta(e.touches[0].clientX - dragStartX);
            }}
            onTouchEnd={() => {
              if (dragStartX !== null) {
                const threshold = 50;
                if (dragDelta > threshold && current > 0) setCurrent(current - 1);
                else if (dragDelta < -threshold && (product.images?.length ?? 0) > current + 1) setCurrent(current + 1);
              }
              setDragStartX(null);
              setDragDelta(0);
            }}
          >
            {(product.images ?? [product.images?.[0]]).filter(Boolean).map((img, idx) => (
              <div key={idx} className="relative shrink-0 w-full h-full">
                {img && (
                  String(img).startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(img)} alt={`${product.title} ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={String(img)} alt={`${product.title} ${idx + 1}`} fill className="object-cover" />
                  )
                )}
              </div>
            ))}
          </div>

          {/* Prev/Next Controls */}
          <button
            aria-label="Previous image"
            className="absolute top-1/2 -translate-y-1/2 left-3 bg-white/90 hover:bg-white text-black rounded-full w-10 h-10 grid place-items-center shadow-soft ring-1 ring-gold/30"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ‹
          </button>
          <button
            aria-label="Next image"
            className="absolute top-1/2 -translate-y-1/2 right-3 bg-white/90 hover:bg-white text-black rounded-full w-10 h-10 grid place-items-center shadow-soft ring-1 ring-gold/30"
            onClick={() => setCurrent((c) => Math.min((product.images?.length ?? 1) - 1, c + 1))}
            disabled={current >= (product.images?.length ?? 1) - 1}
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
            {Array.from({ length: Math.max(1, product.images?.length ?? 0) }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full ${i === current ? 'bg-gold' : 'bg-white/70'} shadow-soft`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`relative w-16 h-16 rounded-2xl overflow-hidden border ${i === current ? 'border-gold' : 'border-gold/20'}`}
              >
                {String(img).startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(img)} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <Image src={String(img)} alt={`thumb ${i + 1}`} fill className="object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2 flex-wrap">
          {product.scents?.map((s) => (
            <span key={s} className="text-xs bg-gold/10 text-black px-2.5 py-1 rounded-full border border-gold/20">{s}</span>
          ))}
          {product.moods?.map((m) => (
            <span key={m} className="text-xs bg-gold/10 text-black px-2.5 py-1 rounded-full border border-gold/20">{m}</span>
          ))}
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-serif tracking-tight text-black">{product.title}</h1>
        {hasDiscount ? (
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-black/60 line-through">LKR {product.price.toFixed(2)}</div>
            <div className="text-gold text-2xl font-semibold">LKR {effectivePrice.toFixed(2)}</div>
          </div>
        ) : (
          <div className="text-gold text-2xl font-semibold mt-2">LKR {product.price.toFixed(2)}</div>
        )}
        { (product.size || product.sku) && (
          <div className="mt-1 text-sm text-black/70">Size: {product.size || product.sku}</div>
        ) }
        {product.limitedEdition && <div className="text-black/80 text-sm mt-1">Limited edition</div>}
        <div className="gold-divider my-4" />
        <p className="mt-4 text-black/75 whitespace-pre-line">{product.description}</p>
        {product.ingredients && (
          <div className="mt-4">
            <div className="font-medium text-black">Ingredients</div>
            <p className="text-black/75">{product.ingredients}</p>
          </div>
        )}

        <div className="mt-4 text-xs text-gold/70">
          Please note: Colors may vary subtly with lighting and display settings.
        </div>

        <Button
          className="mt-6"
          variant="gold"
          size="lg"
          onClick={() => {
            add({ id: product.id, title: product.title, price: effectivePrice, image: product.images?.[0], qty: 1 });
            toast.success('Added to cart');
          }}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
