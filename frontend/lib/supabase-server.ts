import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Tables, Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getServerClient() {
  const headerList = await headers();
  const authHeader = headerList.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  return createClient<Database>(
    supabaseUrl ?? "https://placeholder.supabase.co",
    supabaseAnonKey ?? "placeholder-anon-key",
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    }
  );
}

export async function getAuthenticatedContext() {
  const supabase = await getServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Unauthorized: No valid session found.", status: 401 } as const;
  }

  // Use admin client to check the profile role safely
  // (We use admin client here because profiles might have RLS that prevents users from seeing other roles)
  const { getSupabaseAdmin, isSupabaseAdminConfigured } = await import("./supabase-admin");
  
  if (!isSupabaseAdminConfigured) {
    return { error: "Server configuration error.", status: 500 } as const;
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Unauthorized: Profile not found.", status: 403 } as const;
  }

  return { user, profile } as { user: User; profile: Tables<"profiles"> };
}

export async function verifyAdmin() {
  const auth = await getAuthenticatedContext();
  if ("error" in auth) {
    return auth;
  }

  if (auth.profile.role !== "Superadmin") {
    return { error: "Unauthorized: Superadmin role required.", status: 403 } as const;
  }

  return auth;
}
