import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import toast from 'react-hot-toast';

interface Props { product: any }

export default function ProductCard({ product }: Props) {
  const { add } = useCart();
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 flex flex-col">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative w-full h-48 bg-gray-100 rounded">
          {product.images?.[0] && (
            <Image src={product.images[0]} alt={product.title} fill className="object-cover rounded" />
          )}
        </div>
        <div className="mt-3">
          <h3 className="font-medium line-clamp-1">{product.title}</h3>
          <div className="text-brand font-semibold">${product.price?.toFixed?.(2) ?? product.price}</div>
          {product.limitedEdition && <span className="text-xs text-amber-600">Limited edition</span>}
        </div>
      </Link>
      <div className="mt-auto pt-3">
        <button
          className="w-full bg-brand text-white rounded-md py-2 hover:bg-brand/90"
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
