"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  role: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cache the last fetched user ID so auth-state events don't re-query the
  // profile when the user hasn't changed (e.g. token refresh events).
  const lastFetchedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchProfileForUser = async (userId: string) => {
      if (lastFetchedUserId.current === userId) return; // already cached
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (active) {
        lastFetchedUserId.current = userId;
        setRole(profile?.role ?? null);
      }
    };

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
        await fetchProfileForUser(data.session.user.id);
      } else {
        setRole(null);
      }

      if (active) setLoading(false);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!active) return;

      setSession(currentSession);

      if (currentSession?.user) {
        void fetchProfileForUser(currentSession.user.id).then(() => {
          if (active) setLoading(false);
        });
      } else {
        lastFetchedUserId.current = null;
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
