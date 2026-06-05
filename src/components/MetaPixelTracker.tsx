import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NOVU_META_PIXEL_ID } from '@/config/branding';
import { initPixel, trackEvent } from '@/lib/metaPixel';

/**
 * Initializes the NOVU global Meta Pixel (if configured) and fires
 * a PageView event on every route change.
 *
 * Per-creator pixels are initialized on the pages that know which
 * creator is being viewed (e.g. course detail, creator profile).
 */
export function MetaPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    initPixel(NOVU_META_PIXEL_ID);
  }, []);

  useEffect(() => {
    trackEvent('PageView');
  }, [location.pathname, location.search]);

  return null;
}
