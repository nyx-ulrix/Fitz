import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { api } from "./api";

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

interface Profile {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  undertone?: string;
  season?: string;
  skinTone?: string;
  palette?: { name: string; hex: string }[];
  avoidColours?: { name: string; hex: string }[];
  measurements?: Record<string, string>;
  sizes?: Record<string, string>;
  bodyShape?: string;
  styleAdvice?: string;
}

interface AuthContextType {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null, profile: null, loading: true,
  signIn: async () => {}, signOut: async () => {}, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]     = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (tok?: string) => {
    const t = tok ?? token;
    if (!t) return;
    try {
      const { profile: p } = await api.getProfile(t);
      setProfile(p);
    } catch (e) {
      console.log("Refresh profile error:", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
        refreshProfile(session.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const t = session?.access_token ?? null;
      setToken(t);
      if (t) refreshProfile(t);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { session } = await api.signin(email, password);
    setToken(session.access_token);
    await refreshProfile(session.access_token);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ token, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
