// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://novuproject.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static public routes. Hash-router paths use #/, but we expose clean paths so
// search engines (and the share previews) can still see something useful.
const entries: SitemapEntry[] = [
  { path: "/",           changefreq: "weekly",  priority: "1.0" },
  { path: "/courses",    changefreq: "daily",   priority: "0.9" },
  { path: "/precios",    changefreq: "monthly", priority: "0.8" },
  { path: "/comisiones", changefreq: "monthly", priority: "0.6" },
  { path: "/terminos",   changefreq: "yearly",  priority: "0.3" },
  { path: "/privacidad", changefreq: "yearly",  priority: "0.3" },
];

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority   ? `    <priority>${e.priority}</priority>`     : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
