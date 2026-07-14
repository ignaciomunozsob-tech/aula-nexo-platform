import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://soynovu.cl';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

interface SEOProps {
  title: string;
  description: string;
  path?: string;          // e.g. "/precios"
  type?: 'website' | 'article' | 'product' | 'profile';
  image?: string | null;  // absolute URL preferred
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

/**
 * Per-route SEO head tags. Drop into any route component to override
 * the static head defined in index.html.
 */
export function SEO({
  title,
  description,
  path = '/',
  type = 'website',
  image,
  jsonLd,
  noindex = false,
}: SEOProps) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const trimmedTitle = title.length > 60 ? title.slice(0, 57) + '…' : title;
  const trimmedDesc = description.length > 160 ? description.slice(0, 157) + '…' : description;
  const ogImage = image
    ? (image.startsWith('http') ? image : `${BASE_URL}${image}`)
    : DEFAULT_OG_IMAGE;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{trimmedTitle}</title>
      <meta name="description" content={trimmedDesc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={trimmedTitle} />
      <meta property="og:description" content={trimmedDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="NOVU" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={trimmedTitle} />
      <meta name="twitter:description" content={trimmedDesc} />
      <meta name="twitter:image" content={ogImage} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
