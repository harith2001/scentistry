import { FormEvent, useEffect, useState } from 'react';
import { useCart, type CartItem } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import { ALLOWED_SLIP_TYPES, MAX_SLIP_SIZE } from '@/lib/orderUtils';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/router';

export default function CheckoutPage() {
  const { items, clear, total } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState({ fullName: '', phone: '', email: '', address: '', postalCode: '', city: '' });
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [recipient, setRecipient] = useState({ fullName: '', phone: '', email: '', address: '', postalCode: '', city: '', note: '' });
  const [slip, setSlip] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string>('');
  const [createdOrderId, setCreatedOrderId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reserve and show order code upfront so the user can add it to bank remarks
    const fetchOrderCode = async () => {
      try {
        const res = await fetch('/api/orders/next-code');
        if (res.ok) {
          const data = await res.json();
          setOrderCode(data.code);
        }
      } catch (e) {
        console.error('Failed to fetch next order code', e);
      }
    };
    fetchOrderCode();
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

  useEffect(() => {
    if (slip && slip.type.startsWith('image/')) {
      const url = URL.createObjectURL(slip);
      setSlipPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setSlipPreview(null);
  }, [slip]);

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
      const token = await auth.currentUser?.getIdToken?.();
      const fd = new FormData();
      fd.append('slip', slip);
      fd.append('items', JSON.stringify(items.map((i: CartItem) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty }))));
      fd.append('total', String(total));
      fd.append('customer', JSON.stringify(customer));
      if (orderCode) fd.append('code', orderCode);
      const giftPayload = giftEnabled ? { enabled: true, ...recipient } : { enabled: false };
      fd.append('gift', JSON.stringify(giftPayload));

      const xhr = new XMLHttpRequest();
      const promise = new Promise<{ id: string; code: string }>((resolve, reject) => {
        xhr.open('POST', '/api/orders/create');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
            else reject(new Error(xhr.responseText || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });

      const res = await promise;
      setOrderCode(res.code);
      setCreatedOrderId(res.id);
      clear();
      toast.success('Order created successfully. Thank you!');
      // Redirect to order confirmation/details page
      router.push(`/orders`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create order');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };
console.log('Rerender checkout page', orderCode);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <h1 className="text-xl font-semibold mb-4">Checkout</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-4 rounded-md shadow-sm">
          {orderCode && (
            <div>
              <div className="font-medium mb-1">Your Order Number</div>
              <div className="flex gap-3 items-center">
                <span className="text-lg font-bold font-mono text-ink">{orderCode}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Add this order number to your bank transfer remark.</p>
              {createdOrderId && (
                <div className="mt-2">
                  <a className="text-brand underline" href={`/orders/${createdOrderId}`}>View order details</a>
                </div>
              )}
            </div>
          )}

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
                <textarea className="border rounded px-3 py-2 sm:col-span-2" rows={3} placeholder="Gift note (optional)" value={recipient.note} onChange={e => setRecipient({ ...recipient, note: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <div className="font-medium mb-2">Bank Transfer Slip</div>
            <label className="inline-flex items-center gap-2 px-4 py-2 border rounded cursor-pointer bg-white hover:bg-brand/10 text-ink">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand">
                <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-11zm5 1a.5.5 0 00-.5.5v3H6a.5.5 0 000 1h1.5v3a.5.5 0 001 0v-3H10a.5.5 0 000-1H8.5v-3a.5.5 0 00-.5-.5z" clipRule="evenodd" />
              </svg>
              <span>{slip ? 'Change file' : 'Upload slip'}</span>
              <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setSlip(e.target.files?.[0] || null)} />
            </label>
            <p className="text-sm text-red-600 mt-2">Add the order number as the remarks in transfer slips</p>
            {slip && (
              <div className="mt-3 flex items-start gap-3">
                {slipPreview ? (
                  // Image preview thumbnail
                  <img src={slipPreview} alt="Slip preview" className="w-16 h-16 object-cover rounded border" />
                ) : (
                  // Generic file icon for non-images (e.g., PDF)
                  <div className="w-16 h-16 flex items-center justify-center rounded border bg-ink/5 text-ink/60">PDF</div>
                )}
                <div className="text-sm">
                  <div className="font-medium break-all">{slip.name}</div>
                  <div className="text-ink/60">{(slip.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              </div>
            )}
            {uploadProgress > 0 && (
              <div className="mt-2">
                <div className="h-2 bg-ink/10 rounded">
                  <div className="h-2 bg-brand rounded" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="mt-1 text-xs text-ink/70">Uploading… {uploadProgress}%</div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Allowed: PNG, JPG, PDF. Max 10MB.</p>
          </div>

          <button disabled={loading} className="bg-brand text-white px-6 py-3 rounded hover:bg-brand/90 disabled:opacity-60 inline-flex items-center gap-2">
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {loading ? 'Submitting…' : 'Submit Order'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm h-fit">
        <div className="font-medium mb-2">Order Summary</div>
        <div className="space-y-2 text-sm">
          {items.map((i: CartItem) => (
            <div key={i.id} className="flex justify-between"><span>{i.title} × {i.qty}</span><span>LKR {(i.price * i.qty).toFixed(2)}</span></div>
          ))}
        </div>
        <div className="mt-3 flex justify-between font-semibold"><span>Total</span><span>LKR {total.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
