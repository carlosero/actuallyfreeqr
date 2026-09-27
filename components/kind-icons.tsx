import type { ReactNode } from "react";
import type { PayloadKind } from "@/lib/payload";

/**
 * A phone handset, earpiece top-left: a thick arc whose ends widen into the
 * ear and mouth pieces. Shared by the Call and WhatsApp icons.
 */
const HANDSET =
  "M4.01 3.77A14 14 0 0 0 20.23 19.99A4 4 0 0 0 19.28 14.57A8.5 8.5 0 0 1 14.89 14.19L14.21 16.07A10.5 10.5 0 0 1 7.93 9.79L9.81 9.11A8.5 8.5 0 0 1 9.43 4.72A4 4 0 0 0 4.01 3.77Z";

const GLYPHS: Record<PayloadKind, ReactNode> = {
  // Two links whose ends cross twice; each one breaks where it passes under
  // the other, which is what makes it read as a chain rather than a capsule.
  link: (
    <g transform="rotate(-45 12 12)">
      <path d="M10 15.5H6A3.5 3.5 0 0 1 6 8.5H10A3.5 3.5 0 0 1 13.29 13.2" />
      <path d="M14 8.5H18A3.5 3.5 0 0 1 18 15.5H14A3.5 3.5 0 0 1 10.71 10.8" />
    </g>
  ),
  text: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M8.75 8h6.5M8.75 12h6.5M8.75 16h3.5" />
    </>
  ),
  contact: (
    <>
      <rect x="2.75" y="5" width="18.5" height="14" rx="2.5" />
      <circle cx="8.5" cy="10.25" r="2.25" />
      <path d="M5.5 16c.45-1.6 1.6-2.6 3-2.6s2.55 1 3 2.6M14.25 10h4M14.25 13.75h4" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4.52 14.99A8.25 8.25 0 1 1 8.51 18.98L3.5 20.5Z" />
      <path
        d={HANDSET}
        transform="translate(6.96 6.46) scale(0.42)"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  phone: <path d={HANDSET} />,
};

/**
 * Hand-drawn line icons for the QR types. Inline SVG, so they cost no icon
 * font, no request and nothing extra in the content security policy.
 */
export function KindIcon({ kind }: { kind: PayloadKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[kind]}
    </svg>
  );
}
