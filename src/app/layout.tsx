import './init';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ensureDirectories } from './utils/paths';
import Script from 'next/script';

// Initialize data directories
if (typeof window === 'undefined') {
  ensureDirectories();
}

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

async function getLatestPostUrl() {
  try {
    const response = await fetch('https://xposter-production.up.railway.app/latest');
    const html = await response.text();
    // Extract the X.com URL from the HTML content
    const match = html.match(/https:\/\/x\.com\/i\/web\/status\/(\d+)/);
    return match ? match[1] : null; // Return just the ID
  } catch (error) {
    console.error('Error fetching latest post URL:', error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const tweetId = await getLatestPostUrl();
  const tweetUrl = tweetId ? `https://twitter.com/recapitul8r/status/${tweetId}` : '';
  
  return {
    title: "/pol/-AI",
    description: "AI-powered analysis of online discourse",
    icons: {
      icon: '/favicon.png',
    },
    openGraph: {
      title: "/pol/-AI",
      description: "AI-powered analysis of online discourse",
      type: "website",
      url: "https://pol-ai-production.up.railway.app",
    },
    twitter: {
      card: 'summary_large_image',
      site: '@recapitul8r',
      creator: '@recapitul8r',
      title: "/pol/-AI",
      description: "AI-powered analysis of online discourse",
      images: ['/loading.png']
    },
    alternates: tweetUrl ? {
      canonical: tweetUrl
    } : {},
    other: tweetId ? {
      'twitter:widgets:new-embed-design': 'on',
      'twitter:dnt': 'on',
      'twitter:tweet': tweetId,
      'twitter:url': tweetUrl
    } : {}
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script 
          src="https://platform.twitter.com/widgets.js" 
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
