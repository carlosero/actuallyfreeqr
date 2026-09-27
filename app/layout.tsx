import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const DESCRIPTION =
  "A completely free QR code generator. No sign-up, no email, no account, no tracking, no watermark and no expiry date. Type a name and a link, get a QR code you can share, print and bookmark forever.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "actuallyfreeqr — Free QR code generator. No sign-up, no email, no tracking.",
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  generator: null,
  keywords: [
    "free qr code generator",
    "qr code generator no sign up",
    "qr code without account",
    "no email qr code generator",
    "qr code generator no tracking",
    "qr codes that never expire",
    "free qr code no watermark",
    "shareable qr code link",
    "url to qr code",
    "vcard qr code",
    "whatsapp qr code",
    "phone number qr code",
  ],
  category: "utilities",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Free QR codes. No sign-up, no email, no tracking.",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free QR codes. No sign-up, no email, no tracking.",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f5f1",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
