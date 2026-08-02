import type { NextConfig } from "next";

/**
 * Fully static export. There is no server, no API route and no database —
 * everything (including QR generation) happens in the visitor's browser.
 * That is what lets this be hosted for free forever, and it is also why we
 * are physically unable to track anyone.
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
