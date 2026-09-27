/**
 * Everything in here turns what a person types into the exact string that gets
 * encoded inside the QR code, and back again.
 *
 * A QR code is just text. If that text is a URL, a phone opens the URL. If it
 * is a vCard, the phone offers to save a contact. Nothing points through us,
 * which is why the codes keep working even if this website disappears.
 */

export type PayloadKind = "link" | "text" | "contact" | "whatsapp" | "phone";

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
  if (parseWhatsApp(value)) return "whatsapp";
  if (parseTel(value) !== null) return "phone";
  if (isLikelyUrl(value)) return "link";
  return "text";
}

/** Human-readable label for what a scanner will do with this payload. */
export function describePayload(value: string): string {
  switch (detectKind(value)) {
    case "contact":
      return "Scanning saves a contact";
    case "whatsapp":
      return parseWhatsApp(value)?.message
        ? "Scanning opens a WhatsApp chat with a message ready to send"
        : "Scanning opens a WhatsApp chat";
    case "phone":
      return "Scanning calls this number";
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
  const whatsApp = parseWhatsApp(trimmed);
  if (whatsApp) return `WhatsApp ${whatsApp.phone}`;
  const phone = parseTel(trimmed);
  if (phone !== null) return `Call ${phone}`;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * Keeps what a phone actually dials: a leading + and the digits. The "(0)" in
 * "+44 (0)20 7946 0958" is only dialled from inside the country, so it goes.
 */
export function normalizePhone(input: string): string {
  let value = input.trim();
  if (/^(\+|00)/.test(value)) value = value.replace(/\(0\)/g, "");
  return (value.startsWith("+") ? "+" : "") + value.replace(/\D/g, "");
}

/** Digits plus the separators people type: spaces, dashes, dots, brackets. */
const PHONE_CHARACTERS = /^\+?[\d\s().\-/]*$/;

/** The longest number E.164 allows, country code included. */
const MAX_PHONE_DIGITS = 15;

/**
 * Why a typed number cannot be used yet. "incomplete" fixes itself as the
 * person keeps typing; the others need them to change what they typed.
 */
export type PhoneIssue = "incomplete" | "characters" | "country-code" | "too-long";

export function checkPhone(
  input: string,
  kind: "whatsapp" | "phone",
): PhoneIssue | null {
  const value = input.trim();
  if (!PHONE_CHARACTERS.test(value)) return "characters";
  const compact = normalizePhone(value);

  // A call can be local: the phone dials exactly what is in the code.
  if (kind === "phone") {
    return compact.replace("+", "").length >= 3 ? null : "incomplete";
  }

  // WhatsApp cannot guess the country, so the number has to carry it. A lone
  // 0 may still become the 00 international prefix.
  if (compact === "" || compact === "+" || compact === "0") return "incomplete";
  if (!/^(\+|00)/.test(compact)) return "country-code";
  const digits = whatsAppDigits(compact);
  if (digits.startsWith("0")) return "country-code";
  if (digits.length > MAX_PHONE_DIGITS) return "too-long";
  return digits.length >= 7 ? null : "incomplete";
}

/** A tel: link, which every phone camera offers to call. */
export function buildTel(phone: string): string {
  const compact = normalizePhone(phone);
  return /\d/.test(compact) ? `tel:${compact}` : "";
}

/** The number in a tel: code, if it is exactly what buildTel would make. */
export function parseTel(value: string): string | null {
  return /^tel:(\+?\d+)$/.exec(value.trim())?.[1] ?? null;
}

export type WhatsAppFields = {
  phone: string;
  message: string;
};

/** wa.me wants the full international number as bare digits: no +, no 00. */
function whatsAppDigits(phone: string): string {
  const compact = normalizePhone(phone);
  if (compact.startsWith("+")) return compact.slice(1);
  if (compact.startsWith("00")) return compact.slice(2);
  return compact;
}

/**
 * WhatsApp's click-to-chat link. Scanning it opens a chat with the number,
 * with the message (if any) already typed and waiting to be sent.
 */
export function buildWhatsApp(fields: WhatsAppFields): string {
  const digits = whatsAppDigits(fields.phone);
  if (!digits) return "";
  const message = fields.message.trim();
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}

/**
 * Reads a wa.me link back into form fields. Only links that rebuild into the
 * exact same code count — anything else (a business short link, extra query
 * parameters) stays a plain link, so editing never quietly changes a code.
 */
export function parseWhatsApp(value: string): WhatsAppFields | null {
  const trimmed = value.trim();
  const match = /^https:\/\/wa\.me\/(\d+)(?:\?text=([^&#]*))?$/.exec(trimmed);
  if (!match) return null;
  let message: string;
  try {
    message = decodeURIComponent(match[2] ?? "");
  } catch {
    return null;
  }
  const fields = { phone: `+${match[1]}`, message };
  return buildWhatsApp(fields) === trimmed ? fields : null;
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
