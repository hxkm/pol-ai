import './init';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ensureDirectories } from './utils/paths';

// Initialize data directories
if (typeof window === 'undefined') {
  ensureDirectories();
}

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "/pol/-AI",
  description: "AI-powered analysis of online discourse",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
