import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kharcha — Daily Expense Tracker",
  description: "Roz ka kharcha add karo, mahine ka total dekho.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kharcha", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
