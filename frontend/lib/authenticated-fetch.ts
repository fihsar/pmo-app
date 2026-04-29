import { supabase } from "@/lib/supabase";

export async function authenticatedFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const { data } = await supabase.auth.getSession();

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function authenticatedFetchJson<T>(input: string, init: RequestInit = {}) {
  const response = await authenticatedFetch(input, init);
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}
