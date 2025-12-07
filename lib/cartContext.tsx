import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './authContext';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface CartItem { id: string; title: string; price: number; image?: string; qty: number; key?: string }

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  total: number;
}

const Ctx = createContext<CartCtx>({ items: [], add: () => {}, remove: () => {}, setQty: () => {}, clear: () => {}, total: 0 });

const LS_KEY = 'scentistry_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage for guests
  useEffect(() => {
    if (!user) {
      const raw = globalThis?.localStorage?.getItem(LS_KEY);
      if (raw) setItems(JSON.parse(raw));
    }
  }, [user]);

  // Sync to Firestore when logged in
  useEffect(() => {
    if (!user) return;
    const cartRef = doc(collection(db, 'carts'), user.uid);
    const unsub = onSnapshot(cartRef, (snap: any) => {
      const data = snap.data() as any;
      setItems((data?.items || []) as CartItem[]);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } else {
      const cartRef = doc(collection(db, 'carts'), user.uid);
      // Firestore does not allow undefined anywhere in the payload; strip them.
      const safeItems = items.map((i) => ({
        id: i.id,
        title: i.title,
        price: typeof i.price === 'number' ? i.price : Number(i.price) || 0,
        qty: typeof i.qty === 'number' ? i.qty : Number(i.qty) || 1,
        ...(i.image ? { image: i.image } : {}),
        ...(i.key ? { key: i.key } : {}),
      }));
      try {
        setDoc(cartRef, { items: safeItems }, { merge: true });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to sync cart', e);
      }
    }
  }, [items, user]);

  const api: CartCtx = useMemo(() => ({
    items,
    add: (item: CartItem) => {
      setItems((prev: CartItem[]) => {
        const incomingKey = item.key || `${item.id}:${item.title}`;
        const idx = prev.findIndex((p: CartItem) => (p.key || `${p.id}:${p.title}`) === incomingKey);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
          return copy;
        }
        return [...prev, { ...item, key: incomingKey }];
      });
    },
    remove: (key: string) => setItems((prev: CartItem[]) => prev.filter((p: CartItem) => (p.key || `${p.id}:${p.title}`) !== key)),
    setQty: (key: string, qty: number) => setItems((prev: CartItem[]) => prev.map((p: CartItem) => ((p.key || `${p.id}:${p.title}`) === key ? { ...p, qty } : p))),
    clear: () => setItems([]),
    total: items.reduce((s: number, i: CartItem) => s + i.price * i.qty, 0)
  }), [items]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() { return useContext(Ctx); }
