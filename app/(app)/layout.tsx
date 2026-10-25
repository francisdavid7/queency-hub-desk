import AppSideBar from "@/components/shared/app-sidebar";
import DashboardHeader from "@/components/shared/dashboard-header";
import GsapTransition from "@/components/shared/gsap-transition";
import PwaProvider from "@/components/pwa/pwa-provider";
import { SyncManager } from "@/components/shared/sync-indicator";
import TillGate from "@/components/shared/till-gate";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaProvider />
      <TillGate>
        <SyncManager />
        <SidebarProvider>
          <AppSideBar />

          <main className="min-w-0 w-full flex-1">
            <DashboardHeader />
            <div className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
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
      </TillGate>
    </>
  );
}

export default Layout;
