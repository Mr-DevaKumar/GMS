import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthValue {
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthValue>({
  profile: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) console.error("Profile load error:", error);

    setProfile(data as Profile | null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Listen for login/logout events automatically
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        profile,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
          setProfile(null);
        },
        refresh: load,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);