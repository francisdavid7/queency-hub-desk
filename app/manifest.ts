import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Queency HubDesk",
    short_name: "HubDesk",
    description: "Receipts, payments and customers for the Queency Hub front desk.",
    start_url: "/dashboard",
    scope: "/",
    // Window Controls Overlay gives a native-style title bar on Windows;
    // browsers without it fall back to a standard standalone window.
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "landscape",
    background_color: "#ffffff",
    theme_color: "#1d63f4",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New receipt", url: "/receipts/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Transactions", url: "/transactions" },
      { name: "Customers", url: "/customers" },
    ],
  };
}
