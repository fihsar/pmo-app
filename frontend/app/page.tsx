"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthSession } from "@/components/auth-session-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function App() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const configError = !isSupabaseConfigured
    ? "Supabase environment is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    : "";

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 6) {
      setErrorMsg("Please enter a valid email and a password with at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg("Registration successful. Redirecting to your dashboard...");
          router.replace("/dashboard");
        } else {
          setSuccessMsg("Registration successful! Please check your email for confirmation.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "A system error occurred during authentication.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 font-sans text-foreground selection:bg-primary/20">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm space-y-8">
        
        {/* Modern Minimalist Branding */}
        <div className="text-center space-y-3">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">PMO Dashboard</h1>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">NEXT-GEN PROJECT MANAGEMENT</p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border shadow-sm">
          <CardHeader className="space-y-1 pb-6 pt-8 px-8">
            <CardTitle className="text-xl font-bold tracking-tight">
              {isRegister ? "Create account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isRegister 
                ? "Enter your details below to create your account" 
                : "Enter your credentials to access your dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <form onSubmit={handleAuth} className="space-y-5">
              
              {/* Alert Error */}
              {(configError || errorMsg) && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <p>{configError || errorMsg}</p>
                </div>
              )}

              {/* Alert Sukses */}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs font-medium text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <p>{successMsg}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@workspace.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required 
                  className="h-11 rounded-xl bg-muted/30 text-sm transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                  {!isRegister && (
                    <button type="button" className="text-[10px] font-bold uppercase tracking-tighter text-primary transition-colors hover:opacity-80">
                      Forgot?
                    </button>
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required 
                  className="h-11 rounded-xl bg-muted/30 text-sm transition-all"
                />
              </div>

              <Button 
                className="mt-4 h-11 w-full rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg" 
                type="submit" 
                disabled={loading || !isSupabaseConfigured}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing
                  </span>
                ) : isRegister ? (
                  <span className="flex items-center gap-2 uppercase tracking-widest text-xs">
                    <UserPlus className="h-3.5 w-3.5" /> Sign Up
                  </span>
                ) : (
                  <span className="flex items-center gap-2 uppercase tracking-widest text-xs">
                    <LogIn className="h-3.5 w-3.5" /> Sign In
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 py-8 px-8">
            <div className="mb-2 w-full border-t border-border"></div>
            <p className="text-center text-xs font-medium text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMsg("");
                  setSuccessMsg("");
                  setEmail("");
                  setPassword("");
                }}
                className="ml-1 font-bold text-foreground hover:underline"
                disabled={loading || Boolean(session)}
              >
                {isRegister ? "Log in here" : "Create one for free"}
              </button>
            </p>
          </CardFooter>
        </Card>
        
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          © 2026 PMO Dashboard • Privacy & Terms
        </p>
      </div>
    </div>
  );
}