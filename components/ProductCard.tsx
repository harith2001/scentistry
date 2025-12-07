import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

interface Props { product: any }

export default function ProductCard({ product }: Props) {
  const { add } = useCart();
  const hasDiscount = typeof product.discountedPrice === 'number' && product.discountedPrice > 0 && product.discountedPrice < product.price;
  const effectivePrice = hasDiscount ? product.discountedPrice : product.price;
  const hasSizeOptions = Array.isArray(product?.sizes) && product.sizes.length > 0;
  return (
    <div className="bg-white rounded-3xl border border-gold/15 shadow-soft hover:shadow-lux transition-all duration-300 p-4 sm:p-6 flex flex-col">
      <Link href={`/product/${product.id}`} className="block group" aria-label={product.title}>
        <div className="relative w-full h-56 sm:h-64 bg-black/[0.03] rounded-2xl overflow-hidden">
          {product.images?.[0] && (
            String(product.images[0]).startsWith('http') ? (
              // Render remote blob URL via img to avoid domain config
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            ) : (
              <Image src={product.images[0]} alt={product.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            )
          )}
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="font-serif text-lg tracking-tight text-black line-clamp-1">{product.title}</h3>
          {hasDiscount ? (
            <div className="flex items-baseline gap-2">
              <div className="text-black/60 line-through">LKR {product.price?.toFixed?.(2) ?? product.price}</div>
              <div className="text-gold font-semibold">LKR {effectivePrice?.toFixed?.(2) ?? effectivePrice}</div>
            </div>
          ) : (
            <div className="text-gold font-semibold">LKR {product.price?.toFixed?.(2) ?? product.price}</div>
          )}
          {product.limitedEdition && <span className="text-xs text-black/70">Limited edition</span>}
        </div>
      </Link>
      <div className="mt-auto pt-4">
        {hasSizeOptions ? (
          <Link href={`/product/${product.id}`} className="block">
            <Button className="w-full" variant="gold">
              Select Size
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full"
            variant="gold"
            onClick={() => {
              const key = `${product.id}:${product.title}`;
              add({ id: product.id, title: product.title, price: effectivePrice, image: product.images?.[0], qty: 1, key });
              toast.success('Added to cart');
            }}
          >
            Add to Cart
          </Button>
        )}
      </div>
    </div>
  );
}
