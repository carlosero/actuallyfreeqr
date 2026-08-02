import type { Metadata } from "next";
import { Suspense } from "react";
import { QrView } from "@/components/qr-view";

export const metadata: Metadata = {
  title: "Your QR code",
  description:
    "A QR code you can scan, share, print or bookmark. Free, with no sign-up and no tracking.",
  // Individual codes belong to whoever made them, not to a search index.
  robots: { index: false, follow: true },
};

export default function QrPage() {
  return (
    <Suspense
      fallback={
        <div className="qr-empty">
          <p>Building your QR code…</p>
        </div>
      }
    >
      <QrView />
    </Suspense>
  );
}
