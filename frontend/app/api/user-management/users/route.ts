import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/supabase-server";

export async function GET() {
  const auth = await verifyAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY configuration." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id, full_name, email, role, status")
    .order("email", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await verifyAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY configuration." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    role?: string;
    status?: string;
  };

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = (body.role ?? "Member").trim();
  const status = (body.status ?? "Invited").trim();

  if (!fullName || !email) {
    return NextResponse.json({ error: "Full name and email are required." }, { status: 400 });
  }

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: fullName,
      },
    }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const userId = inviteData.user?.id;

  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId ?? null,
      full_name: fullName,
      email,
      role,
      status,
    },
    { onConflict: "email" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "User invited successfully. They can log in after accepting the invite email.",
  });
}
