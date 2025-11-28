import { useRouter } from 'next/router';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useEffect, useState } from 'react';
import { Product } from '@/types';
import { useCart } from '@/lib/cartContext';
import toast from 'react-hot-toast';

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

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="relative w-full aspect-square bg-gray-100 rounded overflow-hidden select-none">
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
                  <Image src={img} alt={`${product.title} ${idx + 1}`} fill className="object-cover" />
                )}
              </div>
            ))}
          </div>

          {/* Prev/Next Controls */}
          <button
            aria-label="Previous image"
            className="absolute top-1/2 -translate-y-1/2 left-2 bg-white/80 hover:bg-white text-ink rounded-full w-9 h-9 grid place-items-center shadow"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ‹
          </button>
          <button
            aria-label="Next image"
            className="absolute top-1/2 -translate-y-1/2 right-2 bg-white/80 hover:bg-white text-ink rounded-full w-9 h-9 grid place-items-center shadow"
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
                className={`w-2.5 h-2.5 rounded-full ${i === current ? 'bg-brand' : 'bg-white/70'} shadow`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`relative w-16 h-16 rounded overflow-hidden border ${i === current ? 'border-brand' : 'border-transparent'}`}
              >
                <Image src={img} alt={`thumb ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2 flex-wrap">
          {product.scents?.map((s) => (
            <span key={s} className="text-xs bg-gray-100 px-2 py-1 rounded">{s}</span>
          ))}
          {product.moods?.map((m) => (
            <span key={m} className="text-xs bg-gray-100 px-2 py-1 rounded">{m}</span>
          ))}
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <div className="text-brand text-xl font-bold mt-2">LKR {product.price.toFixed(2)}</div>
        { (product.size || product.sku) && (
          <div className="mt-1 text-sm text-gray-700">Size: {product.size || product.sku}</div>
        ) }
        {product.limitedEdition && <div className="text-red-600 text-sm mt-1">Limited edition</div>}
        <p className="mt-4 text-gray-700 whitespace-pre-line">{product.description}</p>
        {product.ingredients && (
          <div className="mt-4">
            <div className="font-medium">Ingredients</div>
            <p className="text-gray-700">{product.ingredients}</p>
          </div>
        )}

        <button
          className="mt-6 bg-brand text-white rounded-md px-6 py-3 hover:bg-brand/90"
          onClick={() => {
            add({ id: product.id, title: product.title, price: product.price, image: product.images?.[0], qty: 1 });
            toast.success('Added to cart');
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
