import Image from "next/image";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import AdminNav from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import logo from "@/public/logo-orange.png";

export const metadata = { title: "Admin · HubDesk" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-svh w-full bg-muted/30">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
        <Image src={logo} alt="Queency Hub" className="w-28" priority />
        <span className="hidden text-sm text-muted-foreground sm:inline">Admin</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-right text-sm">
            <span className="block font-semibold leading-tight">{admin.name}</span>
            <span className="block text-xs text-muted-foreground">@{admin.userName}</span>
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
