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
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Basic validations
    const nextErrors: { email?: string; password?: string } = {};
    const emailTrim = email.trim();
    const passwordTrim = password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) nextErrors.email = 'Email is required';
    else if (!emailRegex.test(emailTrim)) nextErrors.email = 'Enter a valid email';
    if (!passwordTrim) nextErrors.password = 'Password is required';
    else if (passwordTrim.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      toast.error('Please fix the highlighted errors');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, emailTrim, passwordTrim);
      // Set secure server-side session cookie
      try {
        const idToken = await cred.user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, expiresInDays: 7 }),
        });
      } catch (err) {
        console.error('Failed to set session cookie', err);
      }
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
        <div>
          <input
            className={`w-full border rounded px-3 py-2 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-ink/20 focus:border-brand'}`}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <div className="relative">
            <input
              className={`w-full border rounded px-3 py-2 pr-20 ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-ink/20 focus:border-brand'}`}
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 my-1 px-2 text-sm text-ink/70 hover:text-brand bg-white/70 rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
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
