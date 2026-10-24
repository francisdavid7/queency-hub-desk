import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/theme-provider";
import { SearchFieldProvider } from "@/hooks/custom/use-search-field";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HubDesk",
  description: "Receipt and transaction management for Queency Hub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased tracking-tighter`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SearchFieldProvider>
            <main>{children}</main>
            <Toaster position="top-right" />
          </SearchFieldProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
