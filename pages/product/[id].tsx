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
        <div className="relative w-full aspect-square bg-gray-100 rounded">
          {product.images?.[0] && (
            <Image src={product.images[0]} alt={product.title} fill className="object-cover rounded" />
          )}
        </div>
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
        <div className="text-brand text-xl font-bold mt-2">${product.price.toFixed(2)}</div>
        {product.limitedEdition && <div className="text-amber-600 text-sm mt-1">Limited edition</div>}
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
