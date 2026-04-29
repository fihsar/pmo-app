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
import type { Tables } from "@/lib/database.types";

type AuthSessionContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: Tables<"profiles">["role"];
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Tables<"profiles">["role"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (active) setRole(profile?.role ?? null);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!active) return;

      setSession(currentSession);
      
      if (currentSession?.user) {
        void supabase
          .from("profiles")
          .select("role")
          .eq("user_id", currentSession.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (active) setRole(profile?.role ?? null);
            setLoading(false);
          });
      } else {
        setRole(null);
        setLoading(false);
      }
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
      role,
      signOut,
      refreshSession,
    }),
    [loading, session, role]
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