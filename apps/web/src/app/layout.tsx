import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getOptionalCurrentProfile } from "@/lib/server/profile";
import { AppShell } from "./app-shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cairn",
  description: "Private paper library with followed-user reading signals",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
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
