import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateForm } from "@/components/create-form";
import { SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Make a QR code — free, no sign-up, no email",
  description:
    "Make a QR code for a link, a WhatsApp chat, a phone call, a contact card or plain text. Free, no account, no email, no tracking. The code is built in your browser and never expires.",
  alternates: { canonical: "/create" },
};

export default function CreatePage() {
  return (
    <div className="shell page-narrow">
      <SiteHeader cta={false} />

      <main>
        <div className="form-head">
          <h1>Make a QR code</h1>
          <p>
            Pick what it should do, name it, and it is ready. Nothing to sign
            up for and nothing to pay.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="card">
              <p className="preview-empty">Loading the form…</p>
            </div>
          }
        >
          <CreateForm />
        </Suspense>
      </main>
    </div>
  );
}
