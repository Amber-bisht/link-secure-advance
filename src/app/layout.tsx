import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://links.asprin.dev'),
  title: {
    default: "links.asprin.dev - Secure Link Verification",
    template: "%s | links.asprin.dev"
  },
  description: "Secure link wrapper with CAPTCHA protection and multi-layer encryption",
  applicationName: "links.asprin.dev",
  authors: [{ name: "asprin dev" }],
  openGraph: {
    title: "links.asprin.dev - Secure Link Verification",
    description: "Secure link wrapper with CAPTCHA protection and multi-layer encryption",
    url: 'https://links.asprin.dev',
    siteName: 'links.asprin.dev',
    images: [
      {
        url: '/unlocked-icon.png',
        width: 800,
        height: 600,
        alt: 'links.asprin.dev Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "links.asprin.dev - Secure Link Verification",
    description: "Secure link wrapper with CAPTCHA protection and multi-layer encryption",
    images: ['/unlocked-icon.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/unlocked-icon.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
