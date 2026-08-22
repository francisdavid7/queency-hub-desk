"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

import {
  LayoutDashboard,
  SquarePlus,
  ReceiptText,
  Users,
  Blocks,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logo from "../../public/logo-orange.png";

interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Create Receipt",
    href: "/receipts/create",
    icon: SquarePlus,
  },
  {
    title: "Receipts",
    href: "/receipts",
    icon: ReceiptText,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Services",
    href: "/services",
    icon: Blocks,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    comingSoon: true,
  },
];

function AppSideBar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pl-4.5 py-6">
        <Image src={logo} alt="queency-logo" className="w-34" loading="eager" />
      </SidebarHeader>
      <SidebarContent className="px-3 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarMenu className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (pathname !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    className={`${isActive ? "data-active:bg-primary" : ""} 
                      ${item.comingSoon ? "opacity-30 cursor-default pointer-events-none" : ""}
                      flex gap-2 px-3 py-6 font-semibold hover:bg-sidebar-accent`}
                    render={<Link href={item.href} />}
                    tooltip={item.title}
                    isActive={isActive}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>

                  {item.comingSoon && (
                    <SidebarMenuBadge className="bg-info p-2 mt-2 mr-2">
                      Coming soon
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSideBar;
