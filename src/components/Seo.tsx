import { Helmet } from "react-helmet-async";

const SITE_URL = "https://soynovu.cl";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoProps {
  /** Full document title. Include "— NOVU" suffix as needed. */
  title: string;
  description: string;
  /** Relative path (e.g. "/precios") or full URL. Defaults to current pathname at render time. */
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "profile" | "product";
  /** When true, prevents indexing. Used for private/dashboard routes. */
  noindex?: boolean;
}

/**
 * Sitewide SEO helper. Sets <title>, description, canonical, OpenGraph
 * and Twitter card tags for the current route. Uses react-helmet-async;
 * the HelmetProvider lives in src/main.tsx.
 */
export function Seo({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
}: SeoProps) {
  const rel = path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = rel.startsWith("http") ? rel : `${SITE_URL}${rel}`;
  const ogImage = image || DEFAULT_OG_IMAGE;
  const trimmedDesc = description.length > 300 ? `${description.slice(0, 297)}…` : description;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={trimmedDesc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={trimmedDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="NOVU" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={trimmedDesc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

export default Seo;
