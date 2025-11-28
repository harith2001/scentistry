import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

export type Role = 'owner' | 'customer' | null;

interface AuthCtx {
  user: User | null;
  role: Role;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const rDoc = await getDoc(doc(db, 'roles', u.uid));
          const r = rDoc.exists() ? (rDoc.data().role as Role) : 'customer';
          setRole(r);
        } catch (e) {
          console.error(e);
          setRole('customer');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return <Ctx.Provider value={{ user, role, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
