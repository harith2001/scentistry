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
          <title>Scentistry</title>
        </Head>
        <div className="min-h-screen flex flex-col bg-ivory text-ink">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-6">
            <Component {...pageProps} />
          </main>
          <footer className="border-t bg-white">
            <div className="container mx-auto px-4 py-6 text-sm text-gray-500">
              © {new Date().getFullYear()} Scentistry
            </div>
          </footer>
        </div>
        <Toaster position="top-right" />
      </CartProvider>
    </AuthProvider>
  );
}
