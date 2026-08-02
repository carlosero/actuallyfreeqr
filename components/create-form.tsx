"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrErrorBoundary } from "./qr-error-boundary";
import {
  EMPTY_CONTACT,
  MAX_NAME_LENGTH,
  MAX_PAYLOAD_LENGTH,
  buildQrHref,
  buildVCard,
  describePayload,
  detectKind,
  isLikelyUrl,
  normalizeUrl,
  parseVCard,
  payloadByteLength,
  prettyTarget,
  type ContactFields,
  type PayloadKind,
} from "@/lib/payload";

const KINDS: { id: PayloadKind; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "text", label: "Text" },
  { id: "contact", label: "Contact" },
];

/** Above this a code gets visibly denser and wants to be printed bigger. */
const DENSE_THRESHOLD = 900;

export function CreateForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Arriving from "Edit" on a QR page: refill the form from the link itself.
  const incoming = (params.get("data") ?? params.get("url") ?? "").trim();
  const incomingKind = incoming ? detectKind(incoming) : "link";

  const [kind, setKind] = useState<PayloadKind>(incomingKind);
  const [name, setName] = useState(() => params.get("name") ?? "");
  const [link, setLink] = useState(() =>
    incomingKind === "link" ? incoming : "",
  );
  const [text, setText] = useState(() =>
    incomingKind === "text" ? incoming : "",
  );
  const [contact, setContact] = useState<ContactFields>(() =>
    incomingKind === "contact" ? parseVCard(incoming) : EMPTY_CONTACT,
  );
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => {
    if (kind === "link") return normalizeUrl(link);
    if (kind === "text") return text.trim();
    return buildVCard(contact);
  }, [kind, link, text, contact]);

  const bytes = payloadByteLength(payload);
  const isTooLong = bytes > MAX_PAYLOAD_LENGTH;
  const isBrokenLink = kind === "link" && payload !== "" && !isLikelyUrl(payload);
  const isReady = payload !== "" && !isTooLong && !isBrokenLink;

  const updateContact = (field: keyof ContactFields, value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!payload) {
      setError(
        kind === "contact"
          ? "Add at least a full name for the contact card."
          : "Add something for the QR code to point at.",
      );
      return;
    }
    if (isBrokenLink) {
      setError(
        "That does not look like a link. Switch to Text if you want to encode it as plain text.",
      );
      return;
    }
    if (isTooLong) {
      setError(
        `That is ${bytes} characters of data — a QR code holds about ${MAX_PAYLOAD_LENGTH}. Try something shorter.`,
      );
      return;
    }

    setError(null);
    router.push(buildQrHref(name, payload));
  };

  return (
    <form className="composer" onSubmit={handleSubmit} noValidate>
      <div className="card">
        <div
          className="segmented"
          role="group"
          aria-label="What should the QR code contain?"
        >
          {KINDS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={kind === option.id}
              onClick={() => {
                setKind(option.id);
                setError(null);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="field" htmlFor="qr-name">
          <span className="field-label">
            Name
            <span className="field-hint">Shown above the QR code</span>
          </span>
          <input
            id="qr-name"
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Spring launch party"
            autoComplete="off"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </label>

        {kind === "link" ? (
          <label className="field" htmlFor="qr-link">
            <span className="field-label">
              Link
              <span className="field-hint">https:// is added for you</span>
            </span>
            <input
              id="qr-link"
              type="text"
              value={link}
              inputMode="url"
              placeholder="example.com/tickets"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setLink(event.target.value);
                setError(null);
              }}
            />
          </label>
        ) : null}

        {kind === "text" ? (
          <label className="field" htmlFor="qr-text">
            <span className="field-label">
              Text
              <span className="field-hint">Shown as-is when scanned</span>
            </span>
            <textarea
              id="qr-text"
              value={text}
              placeholder="Wi-Fi password: hunter2"
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
              }}
            />
          </label>
        ) : null}

        {kind === "contact" ? (
          <div className="field-grid">
            <label className="field" htmlFor="qr-contact-name">
              <span className="field-label">Full name</span>
              <input
                id="qr-contact-name"
                type="text"
                value={contact.fullName}
                placeholder="Ada Lovelace"
                autoComplete="name"
                onChange={(event) => updateContact("fullName", event.target.value)}
              />
            </label>
            <label className="field" htmlFor="qr-contact-org">
              <span className="field-label">Company</span>
              <input
                id="qr-contact-org"
                type="text"
                value={contact.organization}
                placeholder="Analytical Engines"
                autoComplete="organization"
                onChange={(event) =>
                  updateContact("organization", event.target.value)
                }
              />
            </label>
            <label className="field" htmlFor="qr-contact-title">
              <span className="field-label">Role</span>
              <input
                id="qr-contact-title"
                type="text"
                value={contact.title}
                placeholder="Mathematician"
                autoComplete="organization-title"
                onChange={(event) => updateContact("title", event.target.value)}
              />
            </label>
            <label className="field" htmlFor="qr-contact-phone">
              <span className="field-label">Phone</span>
              <input
                id="qr-contact-phone"
                type="text"
                inputMode="tel"
                value={contact.phone}
                placeholder="+1 555 0134"
                autoComplete="tel"
                onChange={(event) => updateContact("phone", event.target.value)}
              />
            </label>
            <label className="field" htmlFor="qr-contact-email">
              <span className="field-label">Email</span>
              <input
                id="qr-contact-email"
                type="text"
                inputMode="email"
                value={contact.email}
                placeholder="ada@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => updateContact("email", event.target.value)}
              />
            </label>
            <label className="field" htmlFor="qr-contact-site">
              <span className="field-label">Website</span>
              <input
                id="qr-contact-site"
                type="text"
                inputMode="url"
                value={contact.website}
                placeholder="example.com"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => updateContact("website", event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="form-actions">
          <button type="submit" className="btn btn-lg" disabled={!isReady}>
            Create QR code
          </button>
          <Link href="/" className="btn btn-ghost">
            Back
          </Link>
        </div>

        <p className="form-foot">
          The code is built in your browser and lives in the link it takes you
          to. Nothing is uploaded, stored or logged — there is nowhere for it to
          go.
        </p>
      </div>

      <aside className="preview" aria-live="polite">
        <p className="preview-label">Live preview</p>
        <p className="preview-name">{name.trim() || "Your QR code"}</p>
        <div className="preview-code">
          {isReady ? (
            <QrErrorBoundary
              resetKey={payload}
              fallback={
                <p className="preview-empty">
                  That is too much data for one QR code.
                </p>
              }
            >
              <QRCodeSVG
                value={payload}
                size={512}
                level="M"
                marginSize={0}
                bgColor="#ffffff"
                fgColor="#0e0e0d"
                title="Preview of your QR code"
              />
            </QrErrorBoundary>
          ) : (
            <p className="preview-empty">
              {isTooLong
                ? "Too much data for one QR code."
                : isBrokenLink
                  ? "Waiting for a valid link…"
                  : "Your code appears here as you type."}
            </p>
          )}
        </div>
        {isReady ? (
          <p className="preview-target">
            {describePayload(payload)}
            <br />
            {prettyTarget(payload)}
            {bytes > DENSE_THRESHOLD
              ? " — dense code, print it large so phones can read it."
              : ""}
          </p>
        ) : null}
      </aside>
    </form>
  );
}
