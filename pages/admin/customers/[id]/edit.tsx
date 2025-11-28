import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';

export default function AdminCustomerEditPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [profile, setProfile] = useState<any>({
    fullName: '', email: '', phone: '', country: '', address: '', postalCode: '', city: '', customerCode: '', isActive: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'profiles', id));
        if (snap.exists()) {
          const p = snap.data() as any;
          setProfile({
            fullName: p.fullName || '',
            email: p.email || '',
            phone: p.phone || '',
            country: p.country || '',
            address: p.address || '',
            postalCode: p.postalCode || '',
            city: p.city || '',
            customerCode: p.customerCode || '',
            isActive: p.isActive ?? true,
          });
        } else {
          toast.error('Customer not found');
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const save = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'profiles', id), {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        country: profile.country,
        address: profile.address,
        postalCode: profile.postalCode,
        city: profile.city,
        isActive: profile.isActive,
        // customerCode left as-is; use Assign Code action to generate/update
      });
      toast.success('Saved');
      router.push(`/admin/customers/${id}`);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit Customer</h1>
      <div className="bg-white rounded-md p-4 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Full name" value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Phone" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Country" value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })} />
          <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Address" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Postal code" value={profile.postalCode} onChange={e => setProfile({ ...profile, postalCode: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="City" value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={profile.isActive} onChange={e => setProfile({ ...profile, isActive: e.target.checked })} />
            <span>Active</span>
          </label>
          <div className="text-sm text-gray-600">Customer Code: <span className="font-mono">{profile.customerCode || '-'}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="px-4 py-2 border rounded bg-white hover:bg-brand/10 text-ink">Save</button>
          <button onClick={() => router.back()} className="px-4 py-2 border rounded bg-white hover:bg-ink/10 text-ink">Cancel</button>
        </div>
      </div>
    </div>
  );
}
