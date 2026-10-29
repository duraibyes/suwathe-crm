import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Suwathe CRM", template: "%s · Suwathe CRM" },
  description: "Leads, follow-ups, payments and renewals for Suwathe Tech Solutions.",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/favicon-48.png", sizes: "48x48" }], apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "Suwathe CRM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#071b3d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
