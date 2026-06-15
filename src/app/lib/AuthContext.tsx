import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "./api";
import { supabase } from "./supabaseClient";

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
  signIn: (email: string, password: string) => Promise<string>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  profile: null,
  loading: true,
  signIn: async () => "",
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

async function syncSession(session: { access_token: string; refresh_token: string } | null) {
  if (session) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return session.access_token;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
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

  const bootstrapIfNeeded = async (accessToken: string) => {
    try {
      await api.bootstrapProfile(accessToken);
    } catch (e) {
      console.log("Bootstrap profile error:", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
        await bootstrapIfNeeded(session.access_token);
        await refreshProfile(session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const t = session?.access_token ?? null;
        setToken(t);
        if (t) {
          if (event === "SIGNED_IN") {
            await bootstrapIfNeeded(t);
          }
          await refreshProfile(t);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { session } = await api.signin(email, password);
    await syncSession(session);
    setToken(session.access_token);
    await bootstrapIfNeeded(session.access_token);
    await refreshProfile(session.access_token);
    return session.access_token;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        profile,
        loading,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
