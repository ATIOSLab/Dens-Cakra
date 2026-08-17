import type { ReactNode } from "react";

import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { cn } from "@/lib/utils";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: APP_CONFIG.name,
  title: {
    default: APP_CONFIG.meta.title,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.meta.description,
  keywords: APP_CONFIG.meta.keywords,
  authors: [{ name: APP_CONFIG.name }],
  creator: APP_CONFIG.name,
  publisher: APP_CONFIG.name,
  category: "national performance management and situational awareness dashboard",
  icons: {
    icon: [
      { url: "/brand/bin-logo.svg", type: "image/svg+xml" },
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/bin-logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/bin-logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/bin-logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/brand/bin-logo.svg", type: "image/svg+xml" }, { url: "/brand/favicon.ico" }],
    apple: [{ url: "/brand/bin-logo-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: APP_CONFIG.name,
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
  twitter: {
    card: "summary",
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    title: APP_CONFIG.name,
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang="id"
      className={cn(fontVars, theme_mode === "dark" && "dark")}
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript />
      </head>
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
            {children}
            <Toaster />
          </PreferencesStoreProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
