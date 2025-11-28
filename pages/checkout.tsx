import { FormEvent, useEffect, useState } from 'react';
import { useCart, type CartItem } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import { ALLOWED_SLIP_TYPES, MAX_SLIP_SIZE, generateOrderCode } from '@/lib/orderUtils';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebaseClient';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useRouter } from 'next/router';

export default function CheckoutPage() {
  const { items, clear, total } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState({ fullName: '', phone: '', email: '', address: '', postalCode: '', city: '' });
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [recipient, setRecipient] = useState({ fullName: '', phone: '', email: '', address: '', postalCode: '', city: '' });
  const [slip, setSlip] = useState<File | null>(null);
  const [orderCode, setOrderCode] = useState(generateOrderCode());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      if (user.email) setCustomer(c => ({ ...c, email: user.email || '' }));
      try {
        const snap = await getDoc(doc(db, 'profiles', user.uid));
        if (snap.exists()) {
          const p = snap.data() as any;
          setCustomer({
            fullName: p.fullName || '',
            phone: p.phone || '',
            email: user.email || p.email || '',
            address: p.address || '',
            postalCode: p.postalCode || '',
            city: p.city || '',
          });
        }
      } catch (e) { console.error(e); }
    };
    loadProfile();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Cart is empty'); return; }

    if (slip) {
      if (!ALLOWED_SLIP_TYPES.includes(slip.type)) { toast.error('Invalid file type. Use PNG, JPG, or PDF.'); return; }
      if (slip.size > MAX_SLIP_SIZE) { toast.error('File too large (max 10MB).'); return; }
    } else {
      toast.error('Please upload bank transfer slip.');
      return;
    }

    setLoading(true);
    try {
      const slipPath = `slips/${orderCode}-${Date.now()}-${slip.name}`;
      const slipRef = ref(storage, slipPath);
      await uploadBytes(slipRef, slip);
      const slipUrl = await getDownloadURL(slipRef);

      const docRef = await addDoc(collection(db, 'orders'), {
        userId: user?.uid || null,
        items: items.map((i: CartItem) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty })),
        total,
        customer,
        gift: giftEnabled ? { enabled: true, ...recipient } : { enabled: false },
        slipUrl,
        code: orderCode,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
      });

      clear();
      toast.success('Order created. We will verify payment.');
      router.push(`/orders/${docRef.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <h1 className="text-xl font-semibold mb-4">Checkout</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-4 rounded-md shadow-sm">
          <div>
            <div className="font-medium mb-2">Order Code</div>
            <div className="flex gap-2 items-center">
              <input className="border rounded px-3 py-2 w-64" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} />
              <button type="button" className="px-3 py-2 border rounded" onClick={() => setOrderCode(generateOrderCode())}>Regenerate</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Include this code in your bank transfer remark.</p>
          </div>

          <div>
            <div className="font-medium mb-2">Your Details</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Full name" value={customer.fullName} onChange={e => setCustomer({ ...customer, fullName: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Phone" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
              <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Email" type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
              <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Postal code" value={customer.postalCode} onChange={e => setCustomer({ ...customer, postalCode: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="City" value={customer.city} onChange={e => setCustomer({ ...customer, city: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={giftEnabled} onChange={e => setGiftEnabled(e.target.checked)} />
              <span>Is this a gift?</span>
            </label>
            {giftEnabled && (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <input className="border rounded px-3 py-2" placeholder="Recipient name" value={recipient.fullName} onChange={e => setRecipient({ ...recipient, fullName: e.target.value })} />
                <input className="border rounded px-3 py-2" placeholder="Phone" value={recipient.phone} onChange={e => setRecipient({ ...recipient, phone: e.target.value })} />
                <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Email" type="email" value={recipient.email} onChange={e => setRecipient({ ...recipient, email: e.target.value })} />
                <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Address" value={recipient.address} onChange={e => setRecipient({ ...recipient, address: e.target.value })} />
                <input className="border rounded px-3 py-2" placeholder="Postal code" value={recipient.postalCode} onChange={e => setRecipient({ ...recipient, postalCode: e.target.value })} />
                <input className="border rounded px-3 py-2" placeholder="City" value={recipient.city} onChange={e => setRecipient({ ...recipient, city: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <div className="font-medium mb-2">Bank Transfer Slip</div>
            <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setSlip(e.target.files?.[0] || null)} />
            <p className="text-xs text-gray-500 mt-1">Allowed: PNG, JPG, PDF. Max 10MB.</p>
          </div>

          <button disabled={loading} className="bg-brand text-white px-6 py-3 rounded hover:bg-brand/90 disabled:opacity-60">
            {loading ? 'Submitting…' : 'Submit Order'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm h-fit">
        <div className="font-medium mb-2">Order Summary</div>
        <div className="space-y-2 text-sm">
          {items.map((i: CartItem) => (
            <div key={i.id} className="flex justify-between"><span>{i.title} × {i.qty}</span><span>${(i.price * i.qty).toFixed(2)}</span></div>
          ))}
        </div>
        <div className="mt-3 flex justify-between font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
