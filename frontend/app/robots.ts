import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://servedesk.tech";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/super-admin/", "/kitchen/", "/staff/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
