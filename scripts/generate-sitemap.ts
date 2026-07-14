// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Static routes plus dynamic entries for each published course and each creator with a public slug.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://soynovu.cl";

// Public (anon) credentials read from env when running in Lovable's build sandbox.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static public routes.
const staticEntries: SitemapEntry[] = [
  { path: "/",           changefreq: "weekly",  priority: "1.0" },
  { path: "/marketplace",changefreq: "daily",   priority: "0.9" },
  { path: "/courses",    changefreq: "daily",   priority: "0.9" },
  { path: "/precios",    changefreq: "monthly", priority: "0.8" },
  { path: "/comisiones", changefreq: "monthly", priority: "0.6" },
  { path: "/terminos",   changefreq: "yearly",  priority: "0.3" },
  { path: "/privacidad", changefreq: "yearly",  priority: "0.3" },
];

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[sitemap] Missing Supabase env, skipping dynamic entries.");
    return [];
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const entries: SitemapEntry[] = [];

  // Published courses -> /course/{id}
  const { data: courses, error: coursesErr } = await supabase
    .from("courses")
    .select("id, updated_at, status")
    .eq("status", "published");

  if (coursesErr) {
    console.warn("[sitemap] Failed to load courses:", coursesErr.message);
  } else if (courses) {
    for (const c of courses) {
      entries.push({
        path: `/course/${c.id}`,
        lastmod: c.updated_at ? new Date(c.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  }

  // Creators with a public slug -> /creator/{slug} (the app's real route, /@ is not routed)
  const { data: creators, error: creatorsErr } = await supabase
    .from("profiles")
    .select("creator_slug, updated_at")
    .not("creator_slug", "is", null);

  if (creatorsErr) {
    console.warn("[sitemap] Failed to load creators:", creatorsErr.message);
  } else if (creators) {
    for (const p of creators) {
      if (!p.creator_slug) continue;
      entries.push({
        path: `/creator/${p.creator_slug}`,
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  }

  return entries;
}

function renderSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod    ? `    <lastmod>${e.lastmod}</lastmod>`         : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>`: null,
      e.priority   ? `    <priority>${e.priority}</priority>`      : null,
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

(async () => {
  const dynamic = await fetchDynamicEntries();
  const all = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), renderSitemap(all));
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${dynamic.length} dynamic)`);
})().catch((e) => {
  console.error("[sitemap] generation failed:", e);
  // Fall back to static-only so the build never breaks.
  writeFileSync(resolve("public/sitemap.xml"), renderSitemap(staticEntries));
});
