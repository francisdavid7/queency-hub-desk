import AppSideBar from "@/components/shared/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="w-full">{children}</main>
    </SidebarProvider>
  );
}

export default Layout;
