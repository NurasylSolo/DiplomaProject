import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// Primary font - Clean, modern sans-serif
const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Display font - Bold, distinctive headings
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Mono font - Code and data
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Senti News — Media Intelligence Platform",
    template: "%s | Senti News",
  },
  description:
    "Advanced media monitoring and sentiment analysis platform. Track brand mentions, analyze trends, and gain actionable insights from news and social media.",
  keywords: [
    "media monitoring",
    "sentiment analysis",
    "brand tracking",
    "news analytics",
    "social listening",
    "NLP",
    "AI insights",
  ],
  authors: [{ name: "Senti News Team" }],
  creator: "Senti News",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sentinews.io",
    siteName: "Senti News",
    title: "Senti News — Media Intelligence Platform",
    description:
      "Advanced media monitoring and sentiment analysis platform for brands, agencies, and researchers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Senti News Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Senti News — Media Intelligence Platform",
    description:
      "Advanced media monitoring and sentiment analysis platform.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1219" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${syne.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
        {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: "glass-strong",
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
