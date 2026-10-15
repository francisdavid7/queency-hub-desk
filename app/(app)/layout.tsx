import AppSideBar from "@/components/shared/app-sidebar";
import DashboardHeader from "@/components/shared/dashboard-header";
import GsapTransition from "@/components/shared/gsap-transition";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSideBar />

      <main className="w-full">
        <DashboardHeader />
        <div className="px-8 py-4">
          <GsapTransition
            animationKey="app-route"
            staggerItems
            watchPathname
          >
            {children}
          </GsapTransition>
        </div>
      </main>
    </SidebarProvider>
  );
}

export default Layout;
