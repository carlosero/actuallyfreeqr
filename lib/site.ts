export const SITE_NAME = "actuallyfreeqr";

export const SITE_TAGLINE = "Free QR codes. No sign-up, no email, no tracking.";

/**
 * Used for canonical URLs and social cards. Netlify exposes the deploy URL as
 * `URL` at build time, so this stays correct on preview deploys too.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  "https://actuallyfreeqr.netlify.app"
).replace(/\/$/, "");
