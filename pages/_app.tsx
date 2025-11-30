import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import { CartProvider } from '@/lib/cartContext';
import { AuthProvider } from '@/lib/authContext';
import Header from '@/components/Header';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <CartProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Scentistry • Premium Candles</title>
          <link rel="icon" type="image/svg+xml" href="/logo.svg" />
          <link rel="alternate icon" href="/logo.svg" />
        </Head>
        <div className="min-h-screen flex flex-col bg-ivory text-ink">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-6">
            <Component {...pageProps} />
          </main>
          <footer className="border-t bg-white/90 backdrop-blur">
            <div className="container mx-auto px-4 py-10">
              <div className="grid gap-8 sm:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L20 9l-5 3.64L16.18 20 12 16.9 7.82 20 9 12.64 4 9l5.91-.74L12 2z"/></svg>
                    <span className="text-lg font-semibold">Scentistry</span>
                  </div>
                  <p className="text-sm text-ink/70">Premium candles crafted with care. Illuminate your moments.</p>
                  <div className="mt-4 space-y-1 text-sm">
                    <a href="mailto:scentistryc@gmail.com" className="block text-brand hover:underline">scentistryc@gmail.com</a>
                    <a href="tel:+9477888888800000" className="block text-brand hover:underline">+9477888888800000</a>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 sm:col-span-2 sm:grid-cols-3">
                  <div>
                    <div className="font-medium mb-2">Explore</div>
                    <ul className="space-y-1 text-sm">
                      <li><a className="hover:underline" href="/">Home</a></li>
                      <li><a className="hover:underline" href="/orders">My Orders</a></li>
                      <li><a className="hover:underline" href="/cart">Cart</a></li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Follow</div>
                    <div className="flex items-center gap-3 text-ink/70">
                      <a href="#" aria-label="Facebook" className="hover:text-brand"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.5 9.95v-7.04H7.9V12h2.6V9.8c0-2.56 1.52-3.97 3.84-3.97 1.11 0 2.27.2 2.27.2v2.5h-1.28c-1.26 0-1.65.78-1.65 1.58V12h2.81l-.45 2.91h-2.36v7.04A10 10 0 0022 12z"/></svg></a>
                      <a href="#" aria-label="Instagram" className="hover:text-brand"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 3a5 5 0 110 10 5 5 0 010-10zm6-1a1 1 0 110 2 1 1 0 010-2z"/></svg></a>
                      <a href="#" aria-label="TikTok" className="hover:text-brand"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.27 4.27 0 00-7.3 3.9 12.13 12.13 0 01-8.8-4.47 4.27 4.27 0 001.32 5.7c-.66-.02-1.28-.2-1.83-.5v.05a4.28 4.28 0 003.42 4.19c-.62.17-1.28.2-1.92.07a4.28 4.28 0 004 2.97A8.57 8.57 0 012 19.54a12.09 12.09 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2l-.01-.56A8.7 8.7 0 0022.46 6z"/></svg></a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t text-xs text-ink/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>© {new Date().getFullYear()} Scentistry. All rights reserved.</div>
                <a href="https://harith2001.github.io/harith_portfolio/" target="_blank" rel="noreferrer" className="hover:underline">Developed by Harith Vithanage</a>
              </div>
            </div>
          </footer>
        </div>
        <Toaster position="bottom-center" />
      </CartProvider>
    </AuthProvider>
  );
}
