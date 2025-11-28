import { FormEvent, useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Role, useAuth } from '@/lib/authContext';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Immediately look up role using localId (uid)
      let r: Role = 'customer';
      const uid = cred.user?.uid || auth.currentUser?.uid;
      if (uid) {
        try {
          const rDoc = await getDoc(doc(db, 'roles', uid));
          if (rDoc.exists()) {
            r = (rDoc.data() as any).role as Role;
          }
        } catch (err) {
          // default to customer if roles doc not readable
          console.error(err);
        }
      }
      toast.success('Logged in');
      if (r === 'owner') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    console.log('User role:', role);
    if (role === 'owner') {
      router.replace('/admin');
    } else if (role) {
      router.replace('/');
    }
  }, [user, role, authLoading, router]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-md p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-brand text-white py-2 rounded hover:bg-brand/90 disabled:opacity-60">
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <div className="mt-3 text-sm text-gray-600">
        Don&apos;t have an account? <Link href="/auth/register" className="text-brand">Register</Link>
      </div>
    </div>
  );
}
