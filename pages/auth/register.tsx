import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { auth, db } from '@/lib/firebaseClient';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; confirm?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { fullName?: string; email?: string; password?: string; confirm?: string } = {};
    const nameTrim = fullName.trim();
    const emailTrim = email.trim();
    const passTrim = password.trim();
    const confirmTrim = confirm.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!nameTrim) nextErrors.fullName = 'Full name is required';
    else if (nameTrim.length < 2) nextErrors.fullName = 'Enter your full name';
    if (!emailTrim) nextErrors.email = 'Email is required';
    else if (!emailRegex.test(emailTrim)) nextErrors.email = 'Enter a valid email';
    if (!passTrim) nextErrors.password = 'Password is required';
    else if (passTrim.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (!confirmTrim) nextErrors.confirm = 'Please confirm your password';
    else if (passTrim !== confirmTrim) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    if (nextErrors.fullName || nextErrors.email || nextErrors.password || nextErrors.confirm) {
      toast.error('Please fix the highlighted errors');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailTrim, passTrim);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: nameTrim });
        await setDoc(doc(db, 'profiles', cred.user.uid), {
          customerCode: '',
          fullName: nameTrim,
          email: emailTrim.toLowerCase(),
          phone: '',
          address: '',
          city: '',
          country: '',
          postalCode: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        // Assign a unique customer code via the backend API
        try {
          await fetch('/api/customers/assign-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: cred.user.uid }),
          });
        } catch {}
        // Set secure server-side session cookie
        try {
          const idToken = await cred.user.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, expiresInDays: 7 }),
          });
        } catch {}
        try {
          await sendEmailVerification(cred.user);
          toast.success('Account created. Verification email sent.');
        } catch {
          // If email sending fails, still proceed
          toast.success('Account created successfully');
        }
        router.push('/profile');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to register';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-xl border border-brand/20 shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-ink mb-1">Create your account</h1>
        <p className="text-sm text-ink/70 mb-6">Join Scentistry to track orders and manage your profile.</p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm text-ink/80 mb-1">Full name</label>
            <input
              type="text"
              className={`w-full rounded-md border px-3 py-2 bg-white ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand'}`}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined })); }}
              placeholder="Jane Doe"
              required
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>
          <div>
            <label className="block text-sm text-ink/80 mb-1">Email</label>
            <input
              type="email"
              className={`w-full rounded-md border px-3 py-2 bg-white ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand'}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
              placeholder="you@example.com"
              required
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-ink/80 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full rounded-md border px-3 py-2 pr-20 bg-white ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand'}`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
                  placeholder="••••••••"
                  required
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
            <div>
              <label className="block text-sm text-ink/80 mb-1">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className={`w-full rounded-md border px-3 py-2 pr-20 bg-white ${errors.confirm ? 'border-red-500 focus:border-red-500' : 'border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand'}`}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors(prev => ({ ...prev, confirm: undefined })); }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-2 my-1 px-2 text-sm text-ink/70 hover:text-brand bg-white/70 rounded"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-brand/90 hover:bg-brand text-white py-2.5 shadow-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div className="mt-6 text-sm text-ink/70">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
