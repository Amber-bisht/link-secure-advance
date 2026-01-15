import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { MonetagSW } from "@/components/MonetagSW";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Link BY ASPRIN DEV",
  description: "Secure Link Shortener By Asprin Dev try to free ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <MonetagSW />
          <Script
            src="https://quge5.com/88/tag.min.js"
            data-zone="202437"
            strategy="afterInteractive"
            data-cfasync="false"
          />
        </SessionProvider>
      </body>
    </html>
  );
}
