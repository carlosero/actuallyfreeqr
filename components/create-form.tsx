"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KindIcon } from "./kind-icons";
import { QrErrorBoundary } from "./qr-error-boundary";
import {
  EMPTY_CONTACT,
  MAX_NAME_LENGTH,
  MAX_PAYLOAD_LENGTH,
  buildQrHref,
  buildTel,
  buildVCard,
  buildWhatsApp,
  checkPhone,
  describePayload,
  detectKind,
  isLikelyUrl,
  normalizeUrl,
  parseTel,
  parseVCard,
  parseWhatsApp,
  payloadByteLength,
  prettyTarget,
  type ContactFields,
  type PayloadKind,
  type PhoneIssue,
} from "@/lib/payload";

/** `example` is the Name placeholder: what someone might print above that code. */
const KINDS: { id: PayloadKind; label: string; example: string }[] = [
  { id: "link", label: "Link", example: "Spring launch party" },
  { id: "text", label: "Text", example: "Guest Wi-Fi" },
  { id: "contact", label: "Contact", example: "Add me to your contacts" },
  { id: "whatsapp", label: "WhatsApp", example: "Message us on WhatsApp" },
  { id: "phone", label: "Call", example: "Call the front desk" },
];

/** Problems worth pointing out while someone types. "incomplete" is not one. */
const PHONE_NOTES: Partial<Record<PhoneIssue, string>> = {
  characters:
    "A phone number is only digits. Spaces, dashes and a leading + are fine.",
  "country-code":
    "Start with + and the country code, like +1 555 013 4567. WhatsApp cannot guess the country.",
  "too-long": "That is more digits than a phone number can have.",
};

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
  // WhatsApp and Call share the number, so switching between them keeps it.
  const [phone, setPhone] = useState(
    () => parseWhatsApp(incoming)?.phone ?? parseTel(incoming) ?? "",
  );
  const [message, setMessage] = useState(
    () => parseWhatsApp(incoming)?.message ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => {
    switch (kind) {
      case "link":
        return normalizeUrl(link);
      case "text":
        return text.trim();
      case "contact":
        return buildVCard(contact);
      case "whatsapp":
        return buildWhatsApp({ phone, message });
      case "phone":
        return buildTel(phone);
    }
  }, [kind, link, text, contact, phone, message]);

  const bytes = payloadByteLength(payload);
  const isTooLong = bytes > MAX_PAYLOAD_LENGTH;
  const isBrokenLink = kind === "link" && payload !== "" && !isLikelyUrl(payload);
  const phoneIssue =
    kind === "whatsapp" || kind === "phone" ? checkPhone(phone, kind) : null;
  const phoneNote = phoneIssue ? PHONE_NOTES[phoneIssue] : undefined;
  const isBrokenPhone = phoneIssue !== null && phone.trim() !== "";
  const isReady =
    payload !== "" && !isTooLong && !isBrokenLink && phoneIssue === null;
  const example = KINDS.find((option) => option.id === kind)?.example;

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
          : kind === "whatsapp" || kind === "phone"
            ? "Add the phone number first."
            : "Add something for the QR code to point at.",
      );
      return;
    }
    if (phoneIssue) {
      setError(
        phoneNote ?? "Finish typing the phone number, country code first.",
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
          className="kinds"
          role="radiogroup"
          aria-label="What should scanning the QR code do?"
        >
          {KINDS.map((option) => (
            <label key={option.id} className="kind">
              <input
                type="radio"
                name="kind"
                value={option.id}
                className="sr-only"
                checked={kind === option.id}
                onChange={() => {
                  setKind(option.id);
                  setError(null);
                }}
              />
              <span className="kind-tile">
                <KindIcon kind={option.id} />
                {option.label}
              </span>
            </label>
          ))}
        </div>

        <div className="fields">
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
              placeholder={example}
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

          {kind === "whatsapp" || kind === "phone" ? (
            // Not a wrapping <label>: the note below is a description of the
            // input, and inside the label it would be read out as its name.
            <div className="field">
              <label className="field-label" htmlFor="qr-phone">
                {kind === "whatsapp" ? "WhatsApp number" : "Phone number"}
                <span className="field-hint">Country code first</span>
              </label>
              <input
                id="qr-phone"
                type="text"
                inputMode="tel"
                value={phone}
                placeholder="+1 555 013 4567"
                autoComplete="tel"
                aria-invalid={phoneNote ? true : undefined}
                aria-describedby={phoneNote ? "qr-phone-note" : undefined}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(null);
                }}
              />
              {phoneNote ? (
                <p className="field-note" id="qr-phone-note">
                  {phoneNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {kind === "whatsapp" ? (
            <label className="field" htmlFor="qr-message">
              <span className="field-label">
                Message
                <span className="field-hint">Optional, typed out for them</span>
              </span>
              <textarea
                id="qr-message"
                value={message}
                placeholder="Hi! I would like to book a table."
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError(null);
                }}
              />
            </label>
          ) : null}
        </div>

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
                  : isBrokenPhone
                    ? "Waiting for a valid number…"
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
