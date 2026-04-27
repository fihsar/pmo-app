import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY configuration." },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    role?: string;
    status?: string;
    userId?: string | null;
  };

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = (body.role ?? "Member").trim();
  const status = (body.status ?? "Invited").trim();

  if (!id || !fullName || !email) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (body.userId) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(body.userId, {
      email,
      user_metadata: { full_name: fullName },
    });

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
    }
  }

  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      email,
      role,
      status,
    })
    .eq("id", id);

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 400 });
  }

  return NextResponse.json({ message: "User updated successfully." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY configuration." },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const { data: profile, error: profileFetchError } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (profileFetchError) {
    return NextResponse.json({ error: profileFetchError.message }, { status: 400 });
  }

  if (profile.user_id) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id);
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 400 });
    }
  }

  const { error: deleteError } = await supabaseAdmin.from("profiles").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ message: "User removed successfully." });
}
