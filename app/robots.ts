import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // A /qr link is somebody's code, not a page for a search index.
      disallow: "/qr",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
