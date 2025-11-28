import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/router';
import Logo from '@/components/Logo';
import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const router = useRouter();
  const { items } = useCart();
  const { user, role } = useAuth();
  const count = items.reduce((s, i) => s + i.qty, 0);
  const isAdminRoute = router.pathname.startsWith('/admin');

  const linkClass = (active: boolean) =>
    `relative px-1 py-1 text-sm ${active ? 'text-brand' : 'text-ink/80'} hover:text-brand transition-colors ` +
    "after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-brand after:w-0 hover:after:w-full after:transition-all after:duration-200";

  return (
    <header className="sticky top-0 z-40 border-b border-brand/20 bg-white/70 backdrop-blur shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Logo size={36} />
        <nav className="flex items-center gap-5 text-sm">
          {isAdminRoute ? (
            <>
              <Link href="/admin" className={linkClass(router.pathname === '/admin')}>Dashboard</Link>
              <Link href="/admin/products" className={linkClass(router.pathname === '/admin/products')}>Products</Link>
              <Link href="/admin/orders" className={linkClass(router.pathname === '/admin/orders')}>Orders</Link>
              <Link href="/admin/analytics" className={linkClass(router.pathname === '/admin/analytics')}>Analytics</Link>
            </>
          ) : (
            <>
              <Link href="/" className={linkClass(router.pathname === '/')}>Catalog</Link>
              <Link href="/orders" className={linkClass(router.pathname.startsWith('/orders'))}>Orders</Link>
              {role === 'owner' && <Link href="/admin" className="text-brand font-medium">Admin</Link>}
              <Link href="/cart" className={linkClass(router.pathname === '/cart')}>
                <span className="relative">
                  Cart
                  {count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-xs bg-brand text-white rounded-full w-5 h-5 shadow-sm">{count}</span>
                  )}
                </span>
              </Link>
            </>
          )}
          {user ? (
            <UserMenu onLogout={async () => { await signOut(auth); router.push('/auth/login'); }} email={user.email || ''} photoURL={user.photoURL || ''} displayName={user.displayName || ''} />
          ) : (
            <Link href="/auth/login" className="text-white bg-brand/90 hover:bg-brand rounded-md px-3 py-1 shadow-sm">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function UserMenu({ onLogout, email, photoURL, displayName }: { onLogout: () => Promise<void>; email: string; photoURL: string; displayName: string; }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const name = displayName || (email ? email.split('@')[0] : '');
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'U';

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (btnRef.current && btnRef.current.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 focus:outline-none"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoURL} alt={name || 'Profile'} className="w-9 h-9 rounded-full object-cover ring-1 ring-brand/30 shadow-sm" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-ink/10 text-ink flex items-center justify-center font-semibold ring-1 ring-brand/30 shadow-sm">
            {initials}
          </div>
        )}
        <svg className={`w-4 h-4 text-ink/60 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur rounded-md border border-ink/10 shadow-lg py-1 z-50">
          <Link
            href="/profile"
            className="block px-3 py-2 text-sm text-ink hover:bg-brand/10"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <button
            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-brand/10"
            onClick={async () => { setOpen(false); await onLogout(); }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
