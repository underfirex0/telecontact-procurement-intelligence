import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { WorkspaceProvider } from "@/lib/services/workspace";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: { default: "Telecontact Intelligence — Procurement Intelligence", template: "%s · Telecontact Intelligence" },
  description: "Procurement intelligence prototype built on synthetic Moroccan demo data. Not an officially launched or approved Telecontact product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-base">
        <WorkspaceProvider>
          <Shell>{children}</Shell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
