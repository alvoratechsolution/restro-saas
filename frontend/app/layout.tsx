import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import QueryProvider from "@/providers/QueryProvider";
import ToastProvider from "@/providers/ToastProvider";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://servedesk.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ServeDesk - Modern QR Code Dining & Kitchen Management System",
    template: "%s | ServeDesk",
  },
  description:
    "Next Generation Multi-tenant Restaurant QR Code Ordering, Real-Time Kitchen KDS Display, Waiter Service Alerts & Live Revenue Analytics Platform.",
  keywords: [
    "ServeDesk",
    "Restaurant SaaS",
    "QR Code Ordering System",
    "Kitchen Display System",
    "KDS Screen Software",
    "Digital Restaurant Menu",
    "Multi-tenant Restaurant Software",
    "Waiter Alert System",
    "Contactless Dining App",
    "Restaurant POS Alternative",
    "Table QR Code Generator",
  ],
  authors: [{ name: "ServeDesk Team", url: siteUrl }],
  creator: "ServeDesk",
  publisher: "ServeDesk Platform",
  category: "Technology / Restaurant Management",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "ServeDesk - Modern QR Code Dining & Kitchen Management System",
    description:
      "Transform your restaurant with instant QR table ordering, real-time Kitchen KDS screens, floor waiter alerts, and multi-tenant branch analytics.",
    siteName: "ServeDesk",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "ServeDesk Restaurant Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ServeDesk - Next Gen Restaurant Operating System",
    description:
      "Instant QR Code table ordering, live kitchen line KDS screens, and real-time waiter helpers.",
    images: ["/icon.png"],
    creator: "@servedesk",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Schema.org JSON-LD Structured Data for Search Engine Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ServeDesk",
    operatingSystem: "Web-based Platform",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "29.00",
      priceCurrency: "USD",
      priceValidUntil: "2030-12-31",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1280",
    },
    description:
      "Multi-tenant restaurant SaaS for digital QR menus, instant table ordering, KDS kitchen screens, and waiter service notifications.",
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="font-sans antialiased bg-[#f8fafc] text-slate-800 min-h-screen"
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <ToastProvider />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
