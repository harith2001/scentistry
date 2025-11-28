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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
        await setDoc(doc(db, 'profiles', cred.user.uid), {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: '',
          address: '',
          city: '',
          country: '',
          postalCode: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink/80 mb-1">Full name</label>
            <input
              type="text"
              className="w-full rounded-md border border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand px-3 py-2 bg-white"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-ink/80 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand px-3 py-2 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-ink/80 mb-1">Password</label>
              <input
                type="password"
                className="w-full rounded-md border border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand px-3 py-2 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-ink/80 mb-1">Confirm password</label>
              <input
                type="password"
                className="w-full rounded-md border border-ink/10 focus:border-brand focus:ring-1 focus:ring-brand px-3 py-2 bg-white"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
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
