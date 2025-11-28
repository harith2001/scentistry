import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import Link from 'next/link';

export default function AdminCustomerViewPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'profiles', id));
        if (!snap.exists()) {
          setError('Customer not found');
        } else {
          setProfile({ id: snap.id, ...snap.data() });
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customer {profile.customerCode || profile.id}</h1>
        <Link href={`/admin/customers/${profile.id}/edit`} className="px-3 py-2 border rounded bg-white hover:bg-brand/10 text-ink">Edit</Link>
      </div>

      <div className="bg-white rounded-md p-4 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="font-medium mb-2">Details</div>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Name:</span> {profile.fullName || '-'}</div>
              <div><span className="font-medium">Email:</span> {profile.email || '-'}</div>
              <div><span className="font-medium">Phone:</span> {profile.phone || '-'}</div>
              <div><span className="font-medium">Country:</span> {profile.country || '-'}</div>
              <div><span className="font-medium">Customer Code:</span> {profile.customerCode || '-'}</div>
              <div><span className="font-medium">Status:</span> {profile.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Address</div>
            <div className="text-sm space-y-1">
              <div>{profile.address || '-'}</div>
              <div>{profile.postalCode || ''} {profile.city || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
