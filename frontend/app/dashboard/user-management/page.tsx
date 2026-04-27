"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthSession } from "@/components/auth-session-provider";
import { ShieldAlert } from "lucide-react";

type ProfileRow = {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  email: string;
  role: string | null;
  status: string | null;
};

export default function UserManagementPage() {
  const { role, loading: authLoading } = useAuthSession();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");
  const [status, setStatus] = useState("Invited");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("Member");
  const [editStatus, setEditStatus] = useState("Invited");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase environment is not configured.");
      setLoading(false);
      return;
    }

    if (role !== "Superadmin") {
      setError("Unauthorized: Superadmin access required.");
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/user-management/users", { 
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`
      }
    });
    const payload = (await response.json()) as { users?: ProfileRow[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load users from Supabase.");
      setLoading(false);
      return;
    }

    setUsers(payload.users ?? []);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    if (!authLoading && role === "Superadmin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadUsers();
    } else if (!authLoading && role !== "Superadmin") {
      setLoading(false);
    }
  }, [authLoading, role, loadUsers]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || !normalizedEmail) {
      setError("Please fill in name and email.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/user-management/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        fullName: name.trim(),
        email: normalizedEmail,
        role: selectedRole,
        status,
      }),
    });

    const payload = (await response.json()) as { message?: string; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to invite user.");
      setSaving(false);
      return;
    }

    setSuccess(payload.message ?? "User invited successfully.");
    setName("");
    setEmail("");
    setSelectedRole("Member");
    setStatus("Invited");
    setShowCreateForm(false);
    await loadUsers();
    setSaving(false);
  };

  const startEdit = (user: ProfileRow) => {
    setEditingId(user.id);
    setEditName(user.full_name ?? "");
    setEditEmail(user.email);
    setEditRole(user.role ?? "Member");
    setEditStatus(user.status ?? "Invited");
    setError("");
    setSuccess("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setEditRole("Member");
    setEditStatus("Invited");
  };

  const handleUpdate = async (user: ProfileRow) => {
    setSaving(true);
    setError("");
    setSuccess("");

    const response = await fetch(`/api/user-management/users/${user.id}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        fullName: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole.trim(),
        status: editStatus.trim(),
        userId: user.user_id ?? null,
      }),
    });

    const payload = (await response.json()) as { message?: string; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to update user.");
      setSaving(false);
      return;
    }

    setSuccess(payload.message ?? "User updated successfully.");
    cancelEdit();
    await loadUsers();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteUser) return;

    setDeletingId(pendingDeleteUser.id);
    setError("");
    setSuccess("");

    const response = await fetch(`/api/user-management/users/${pendingDeleteUser.id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });
    const payload = (await response.json()) as { message?: string; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to remove user.");
      setDeletingId(null);
      return;
    }

    setSuccess(payload.message ?? "User removed successfully.");
    await loadUsers();
    setPendingDeleteUser(null);
    setDeletingId(null);
  };

  if (!authLoading && role !== "Superadmin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-destructive/10 p-6">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">Access Denied</h2>
        <p className="max-w-md text-center text-muted-foreground">
          You do not have the necessary permissions to access this page. 
          Please contact a Superadmin if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage user access, roles, and account status.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          disabled={saving}
        >
          {showCreateForm ? "Cancel" : "Add New User"}
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Data source: Supabase `profiles` table.</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">{users.length} users</span>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
              {success}
            </p>
          ) : null}

          {showCreateForm ? (
            <form onSubmit={handleInvite} className="mb-5 grid gap-3 rounded-xl border p-4 md:grid-cols-5">
              <Input
                id="full_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={saving}
                className="md:col-span-2"
              />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                disabled={saving}
                className="md:col-span-2"
              />
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Superadmin">Superadmin</SelectItem>
                  <SelectItem value="Project Manager">Project Manager</SelectItem>
                  <SelectItem value="Project Administrator">Project Administrator</SelectItem>
                  <SelectItem value="Account Manager">Account Manager</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add User"}
              </Button>
            </form>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={5}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={5}>
                      No users found in `profiles`.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {editingId === user.id ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : (
                        user.full_name ?? "-"
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {editingId === user.id ? (
                        <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {editingId === user.id ? (
                        <Select value={editRole} onValueChange={setEditRole} disabled={saving}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Superadmin">Superadmin</SelectItem>
                            <SelectItem value="Project Manager">Project Manager</SelectItem>
                            <SelectItem value="Project Administrator">Project Administrator</SelectItem>
                            <SelectItem value="Account Manager">Account Manager</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        user.role ?? "-"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {user.status ?? "-"}
                        </span>
                        {user.user_id ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                            Auth Linked
                          </span>
                        ) : null}
                      </>
                    </td>
                    <td className="py-3 pr-4">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => void handleUpdate(user)} disabled={saving}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(user)} disabled={saving}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setPendingDeleteUser(user)}
                            disabled={Boolean(deletingId)}
                          >
                            {deletingId === user.id ? "Removing..." : "Remove"}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingDeleteUser)} onOpenChange={(open) => !open && setPendingDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium text-foreground">{pendingDeleteUser?.email}</span> from
              profiles and revoke their auth access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={Boolean(deletingId)} onClick={() => void handleDelete()}>
              {deletingId ? "Removing..." : "Yes, remove user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
