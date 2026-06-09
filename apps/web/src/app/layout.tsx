import type { Metadata } from "next";
import { getOptionalCurrentProfile } from "@/lib/server/profile";
import { AppShell } from "./app-shell";
import { Providers } from "./providers";
import "./globals.css";

// Vercel resolves multiple React type identities in this workspace.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayoutChildren = any;

export const metadata: Metadata = {
  title: "Cairn",
  description: "Private paper library with followed-user reading signals",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: LayoutChildren;
}>) {
  const profile = await getOptionalCurrentProfile();

  return (
    <html lang="en">
      <body>
        <Providers shouldPrefetchAppData={Boolean(profile)}>
          <AppShell profile={profile}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
