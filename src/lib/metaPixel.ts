// Meta (Facebook) Pixel helper
// Carga el script base una vez e inicializa cualquier cantidad de Pixel IDs.
// Soporta eventos globales y por-pixel (trackSingle).

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

const initialized = new Set<string>();
let scriptLoaded = false;

function loadBaseScript() {
  if (scriptLoaded || typeof window === 'undefined') return;
  if (window.fbq) {
    scriptLoaded = true;
    return;
  }
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    let n: any, t: any, s: any;
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  scriptLoaded = true;
}

/** Initialize a Meta Pixel ID (idempotent). */
export function initPixel(id?: string | null) {
  if (!id || typeof window === 'undefined') return;
  const clean = String(id).trim();
  if (!clean || initialized.has(clean)) return;
  loadBaseScript();
  try {
    window.fbq('init', clean);
    initialized.add(clean);
  } catch (e) {
    console.warn('[meta-pixel] init failed', e);
  }
}

/** Fire an event on all initialized pixels. */
export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq || initialized.size === 0) return;
  try {
    if (params) window.fbq('track', name, params);
    else window.fbq('track', name);
  } catch (e) {
    console.warn('[meta-pixel] track failed', e);
  }
}

/** Fire an event only on a specific pixel id. */
export function trackEventFor(id: string | null | undefined, name: string, params?: Record<string, any>) {
  if (!id || typeof window === 'undefined' || !window.fbq) return;
  const clean = String(id).trim();
  if (!clean) return;
  initPixel(clean);
  try {
    if (params) window.fbq('trackSingle', clean, name, params);
    else window.fbq('trackSingle', clean, name);
  } catch (e) {
    console.warn('[meta-pixel] trackSingle failed', e);
  }
}

export function getInitializedPixels(): string[] {
  return Array.from(initialized);
}
