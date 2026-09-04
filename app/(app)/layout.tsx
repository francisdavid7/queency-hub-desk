import AppSideBar from "@/components/shared/app-sidebar";
import DashboardHeader from "@/components/shared/dashboard-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSideBar />

      <main className="w-full">
        <DashboardHeader />
        <div className="px-8 py-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}

export default Layout;
