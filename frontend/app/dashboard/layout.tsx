"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthSession } from "@/components/auth-session-provider";
import { LayoutDashboard, Users, ChevronRight, type LucideIcon, LogOut } from "lucide-react";
import Image from "next/image";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type MenuItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  subItems?: { href: string; label: string; allowedRoles?: string[] }[];
  allowedRoles?: string[];
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    subItems: [
      { href: "/dashboard", label: "Project Dashboard" }, // All roles
      { href: "/dashboard/sales-performance", label: "Sales Performance", allowedRoles: ["Superadmin", "Project Manager", "Project Administrator", "Account Manager"] },
      { href: "/dashboard/prospects", label: "List of Prospects", allowedRoles: ["Superadmin", "Project Manager", "Project Administrator", "Account Manager"] },
      { href: "/dashboard/projects", label: "List of Projects", allowedRoles: ["Superadmin", "Project Manager", "Project Administrator", "Account Manager"] },
      { href: "/dashboard/backlog", label: "Backlog", allowedRoles: ["Superadmin", "Project Manager", "Project Administrator", "Account Manager"] },
    ],
  },
  {
    href: "/dashboard/user-management",
    label: "User Management",
    icon: Users,
    allowedRoles: ["Superadmin"],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebarContent>{children}</DashboardSidebarContent>
    </SidebarProvider>
  );
}

function DashboardSidebarContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setOpen } = useSidebar();
  const { user, loading, session, role, signOut } = useAuthSession();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/");
    }
  }, [loading, router, session]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const handleItemClick = (hasSubItems: boolean) => {
    if (hasSubItems && state === "collapsed") {
      setOpen(true);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Supabase environment is not configured.</p>
      </main>
    );
  }

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild onClick={() => handleItemClick(true)}>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 p-1">
                    <Image src="/logo.png" alt="PMO Logo" width={24} height={24} className="rounded-sm" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-primary">PMO Dashboard</span>
                    <span className="text-[10px] uppercase text-muted-foreground">Next-Gen PM</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {menuItems
                .filter(item => !item.allowedRoles || (role && item.allowedRoles.includes(role)))
                .map((item) => {
                  const Icon = item.icon;
                  // Filter sub-items as well
                  const filteredSubItems = item.subItems?.filter(sub => !sub.allowedRoles || (role && sub.allowedRoles.includes(role)));
                  
                  const isActive = item.href ? pathname === item.href : filteredSubItems?.some(s => pathname === s.href);
                  
                  if (filteredSubItems && filteredSubItems.length > 0) {
                    return (
                      <Collapsible key={item.label} asChild defaultOpen={isActive} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label} isActive={isActive} onClick={() => handleItemClick(true)}>
                              <Icon />
                              <span>{item.label}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {filteredSubItems.map((sub) => (
                                <SidebarMenuSubItem key={sub.href}>
                                  <SidebarMenuSubButton asChild isActive={pathname === sub.href}>
                                    <Link href={sub.href}>
                                      <span>{sub.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href} onClick={() => handleItemClick(false)}>
                      <Link href={item.href!}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {state !== "collapsed" && (
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="w-full justify-start hover:bg-transparent cursor-default">
                  <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                    <span className="text-xs text-muted-foreground truncate">Signed in as {role || "Member"}</span>
                    <span className="font-medium text-sm truncate">{user?.email ?? "Unknown user"}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut} 
                className="text-muted-foreground hover:text-foreground"
                tooltip="Sign out"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 pt-6">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
