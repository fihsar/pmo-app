"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthSessionContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    const initializeSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setLoading(false);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!active) return;

      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.auth.refreshSession();
    setSession(data.session);
  };

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      refreshSession,
    }),
    [loading, session]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }

  return context;
}