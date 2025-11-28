import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/lib/authContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', address: '', postalCode: '', city: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const ref = doc(db, 'profiles', user.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as any) : {};
        setForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          email: user.email || data.email || '',
          address: data.address || '',
          postalCode: data.postalCode || '',
          city: data.city || '',
        });
      } catch (e) {
        console.error(e);
      }
    };
    run();
  }, [user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, 'profiles', user.uid);
      await setDoc(ref, { ...form, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('Profile saved');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading…</div>;
  if (!user) return <div>Please login to edit your profile.</div>;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-md p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Your Profile</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border rounded px-3 py-2 w-full" placeholder="Full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
        <input className="border rounded px-3 py-2 w-full" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <input className="border rounded px-3 py-2 w-full" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="border rounded px-3 py-2 w-full" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Postal code" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        </div>
        <button disabled={saving} className="bg-brand text-white rounded px-4 py-2 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  );
}
