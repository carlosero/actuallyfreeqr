/**
 * Everything in here turns what a person types into the exact string that gets
 * encoded inside the QR code, and back again.
 *
 * A QR code is just text. If that text is a URL, a phone opens the URL. If it
 * is a vCard, the phone offers to save a contact. Nothing points through us,
 * which is why the codes keep working even if this website disappears.
 */

export type PayloadKind = "link" | "text" | "contact";

/** Practical ceiling for a byte-mode QR at error correction level M. */
export const MAX_PAYLOAD_LENGTH = 1800;

export const MAX_NAME_LENGTH = 80;

/**
 * Accepts what people actually type ("example.com", "www.example.com/x") and
 * turns it into something a phone camera can open. Anything that already
 * carries a scheme (mailto:, tel:, upi:, bitcoin:, ...) is left alone.
 */
export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://${value}`;
}

/** Does this string look like something a camera app would open as a link? */
export function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^(https?|mailto|tel|sms|geo|bitcoin|upi|otpauth):/i.test(trimmed)) {
    return true;
  }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|\?|#|:)/i.test(trimmed);
}

export function isVCard(value: string): boolean {
  return /^BEGIN:VCARD/i.test(value.trim());
}

/** QR capacity is counted in bytes, and one emoji is four of them. */
export function payloadByteLength(value: string): number {
  if (typeof TextEncoder === "undefined") return value.length;
  return new TextEncoder().encode(value).length;
}

/**
 * Only ever put a payload in an `href` after this. A QR payload is arbitrary
 * text typed by whoever built the link, so `javascript:` and friends stay out.
 */
export function safeHref(value: string): string | null {
  const trimmed = value.trim();
  return /^(https?|mailto|tel|sms):/i.test(trimmed) ? trimmed : null;
}

export function detectKind(value: string): PayloadKind {
  if (isVCard(value)) return "contact";
  if (isLikelyUrl(value)) return "link";
  return "text";
}

/** Human-readable label for what a scanner will do with this payload. */
export function describePayload(value: string): string {
  switch (detectKind(value)) {
    case "contact":
      return "Scanning saves a contact";
    case "link":
      return "Scanning opens this link";
    default:
      return "Scanning shows this text";
  }
}

/** Strips the scheme so long links stay readable underneath the QR code. */
export function prettyTarget(value: string): string {
  const trimmed = value.trim();
  if (isVCard(trimmed)) {
    const name = /(?:^|\r?\n)FN:(.*)/i.exec(trimmed)?.[1]?.trim();
    return name ? `Contact card — ${unescapeVCardValue(name)}` : "Contact card";
  }
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export type ContactFields = {
  fullName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  website: string;
};

export const EMPTY_CONTACT: ContactFields = {
  fullName: "",
  organization: "",
  title: "",
  phone: "",
  email: "",
  website: "",
};

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function unescapeVCardValue(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\([\\;,])/g, "$1");
}

/** Builds a vCard 3.0 payload — the format both iOS and Android understand. */
export function buildVCard(contact: ContactFields): string {
  const fullName = contact.fullName.trim();
  if (!fullName) return "";

  const parts = fullName.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : fullName;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardValue(last)};${escapeVCardValue(first)};;;`,
    `FN:${escapeVCardValue(fullName)}`,
  ];

  if (contact.organization.trim()) {
    lines.push(`ORG:${escapeVCardValue(contact.organization.trim())}`);
  }
  if (contact.title.trim()) {
    lines.push(`TITLE:${escapeVCardValue(contact.title.trim())}`);
  }
  if (contact.phone.trim()) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact.phone.trim())}`);
  }
  if (contact.email.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(contact.email.trim())}`);
  }
  if (contact.website.trim()) {
    lines.push(`URL:${escapeVCardValue(normalizeUrl(contact.website))}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Best-effort read of a vCard back into form fields, so /qr can be edited. */
export function parseVCard(value: string): ContactFields {
  const read = (field: string) => {
    const match = new RegExp(`(?:^|\\r?\\n)${field}[^:\\r\\n]*:(.*)`, "i").exec(
      value,
    );
    return match ? unescapeVCardValue(match[1].trim()) : "";
  };

  return {
    fullName: read("FN"),
    organization: read("ORG"),
    title: read("TITLE"),
    phone: read("TEL"),
    email: read("EMAIL"),
    website: read("URL"),
  };
}

/**
 * The shareable address of a QR code. The whole code lives in the query
 * string, so the link is the code: bookmark it, text it to a colleague, put it
 * in a slide — it renders the same thing for everyone, forever.
 */
export function buildQrHref(name: string, data: string): string {
  const params = new URLSearchParams();
  const trimmedName = name.trim();
  if (trimmedName) params.set("name", trimmedName.slice(0, MAX_NAME_LENGTH));
  params.set("data", data);
  return `/qr?${params.toString()}`;
}

export function buildEditHref(name: string, data: string): string {
  const params = new URLSearchParams();
  if (name.trim()) params.set("name", name.trim());
  if (data) params.set("data", data);
  const query = params.toString();
  return query ? `/create?${query}` : "/create";
}

/** Turns a label into something safe to use as a downloaded file name. */
export function toFileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "qr-code"}.png`;
}
