import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartContext';

export default function CartPage() {
  const { items, setQty, remove, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center space-y-3">
        <div className="text-gray-600">Your cart is empty.</div>
        <Link href="/" className="text-brand">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 bg-white rounded-md p-3 shadow-sm">
            <div className="relative w-20 h-20 bg-gray-100 rounded">
              {it.image && <Image src={it.image} alt={it.title} fill className="object-cover rounded" />}
            </div>
            <div className="flex-1">
              <div className="font-medium">{it.title}</div>
              <div className="text-sm text-gray-500">LKR.{it.price.toFixed(2)}</div>
              <div className="mt-2 flex items-center gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}>-</button>
                <input
                  className="w-14 text-center border rounded py-1"
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => setQty(it.id, Math.max(1, parseInt(e.target.value || '1', 10)))}
                />
                <button className="px-2 py-1 border rounded" onClick={() => setQty(it.id, it.qty + 1)}>+</button>
              </div>
            </div>
            <button className="text-sm text-red-600" onClick={() => remove(it.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-md p-4 shadow-sm h-fit">
        <div className="flex justify-between font-medium">
          <span>Subtotal</span>
          <span>LKR.{total.toFixed(2)}</span>
        </div>
        <Link href="/checkout" className="block mt-4 bg-brand text-white text-center rounded-md py-2 hover:bg-brand/90">Checkout</Link>
      </div>
    </div>
  );
}
