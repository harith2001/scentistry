import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/router';
import Logo from '@/components/Logo';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';

export default function Header() {
  const router = useRouter();
  const { items } = useCart();
  const { user, role } = useAuth();
  const count = items.reduce((s, i) => s + i.qty, 0);
  const isAdminRoute = router.pathname.startsWith('/admin');
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `relative px-1 py-1 text-sm ${active ? 'text-gold' : 'text-black/70'} hover:text-gold transition-colors ` +
    "after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-gold after:w-0 hover:after:w-full after:transition-all after:duration-200";

  return (
    <header className="sticky top-0 z-40 border-b border-gold/15 bg-white/85 backdrop-blur-md shadow-soft">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} />
        </div>
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {isAdminRoute ? (
            <>
              <Link href="/admin" className={linkClass(router.pathname === '/admin')}>Dashboard</Link>
              <Link href="/admin/products" className={linkClass(router.pathname === '/admin/products')}>Products</Link>
              <Link href="/admin/orders" className={linkClass(router.pathname === '/admin/orders')}>Orders</Link>
              <Link href="/admin/customers" className={linkClass(router.pathname === '/admin/customers')}>Customers</Link>
              <Link href="/admin/analytics" className={linkClass(router.pathname === '/admin/analytics')}>Analytics</Link>
            </>
          ) : (
            <>
              <Link href="/" className={linkClass(router.pathname === '/')}>Home</Link>
              <Link href="/orders" className={linkClass(router.pathname.startsWith('/orders'))}>Orders</Link>
              {role === 'owner' && <Link href="/admin" className="text-gold font-medium">Admin</Link>}
              <Link href="/cart" className={linkClass(router.pathname === '/cart')}>
                <span className="relative">
                  Cart
                  {count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-xs bg-gold text-black rounded-full w-5 h-5 shadow-soft">{count}</span>
                  )}
                </span>
              </Link>
            </>
          )}
          {user ? (
            <UserMenu onLogout={async () => { try { await fetch('/api/auth/session', { method: 'DELETE' }); } catch {} await signOut(auth); router.push('/auth/login'); }} email={user.email || ''} photoURL={user.photoURL || ''} displayName={user.displayName || ''} />
          ) : (
            <Link href="/auth/login" className="inline-block">
              <Button variant="gold" size="sm">Login</Button>
            </Link>
          )}
        </nav>
        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/cart" className="relative" aria-label="Cart">
            <Button variant="outline" size="sm" className="px-3 py-2">
              <span className="sr-only">Cart</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] bg-gold text-black rounded-full w-5 h-5 shadow-soft">{count}</span>
              )}
            </Button>
          </Link>
          {user ? (
            <UserMenu onLogout={async () => { try { await fetch('/api/auth/session', { method: 'DELETE' }); } catch {} await signOut(auth); router.push('/auth/login'); }} email={user.email || ''} photoURL={user.photoURL || ''} displayName={user.displayName || ''} />
          ) : (
            <Link href="/auth/login" aria-label="Login"><Button variant="gold" size="sm">Login</Button></Link>
          )}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="rounded-2xl border border-gold/30 bg-white/70 backdrop-blur px-3 py-2 text-black shadow-soft active:scale-95 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h14" />
                  <path d="M3 18h10" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gold/15 bg-white/95 backdrop-blur pb-6 shadow-soft animate-slide-up">
          <div className="container mx-auto px-4 pt-4 flex flex-col gap-4 text-sm">
            {isAdminRoute ? (
              <>
                <Link onClick={() => setMobileOpen(false)} href="/admin" className={linkClass(router.pathname === '/admin')}>Dashboard</Link>
                <Link onClick={() => setMobileOpen(false)} href="/admin/products" className={linkClass(router.pathname === '/admin/products')}>Products</Link>
                <Link onClick={() => setMobileOpen(false)} href="/admin/orders" className={linkClass(router.pathname === '/admin/orders')}>Orders</Link>
                <Link onClick={() => setMobileOpen(false)} href="/admin/customers" className={linkClass(router.pathname === '/admin/customers')}>Customers</Link>
                <Link onClick={() => setMobileOpen(false)} href="/admin/analytics" className={linkClass(router.pathname === '/admin/analytics')}>Analytics</Link>
              </>
            ) : (
              <>
                <Link onClick={() => setMobileOpen(false)} href="/" className={linkClass(router.pathname === '/')}>Home</Link>
                <Link onClick={() => setMobileOpen(false)} href="/orders" className={linkClass(router.pathname.startsWith('/orders'))}>Orders</Link>
                {role === 'owner' && <Link onClick={() => setMobileOpen(false)} href="/admin" className="text-gold font-medium">Admin</Link>}
                <Link onClick={() => setMobileOpen(false)} href="/cart" className={linkClass(router.pathname === '/cart')}>Cart</Link>
              </>
            )}
          </div>
        </div>
      )}
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
          <img src={photoURL} alt={name || 'Profile'} className="w-9 h-9 rounded-full object-cover ring-1 ring-gold/30 shadow-soft" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-black/5 text-black flex items-center justify-center font-semibold ring-1 ring-gold/30 shadow-soft">
            {initials}
          </div>
        )}
        <svg className={`w-4 h-4 text-black/60 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur rounded-2xl border border-gold/20 shadow-lux py-1 z-50">
          <Link
            href="/profile"
            className="block px-4 py-2.5 text-sm text-black hover:bg-gold/10"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-black hover:bg-gold/10"
            onClick={async () => { setOpen(false); await onLogout(); }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
