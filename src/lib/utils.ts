import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(priceClp: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(priceClp);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function getSessionId(): string {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

/**
 * Pretty public URL helpers. All products live under /:creatorSlug/:productSlug.
 * Falls back to product-type prefixed legacy URL when creator slug is missing.
 */
export function getCourseUrl(
  creatorSlug: string | null | undefined,
  courseSlug: string | null | undefined,
): string {
  if (creatorSlug && courseSlug) return `/${creatorSlug}/${courseSlug}`;
  return `/course/${courseSlug ?? ''}`;
}

export function getEventUrl(
  creatorSlug: string | null | undefined,
  eventSlug: string | null | undefined,
  eventId?: string | null,
): string {
  if (creatorSlug && eventSlug) return `/${creatorSlug}/${eventSlug}`;
  return `/event/${eventId ?? eventSlug ?? ''}`;
}

export function getEbookUrl(
  creatorSlug: string | null | undefined,
  ebookSlug: string | null | undefined,
  ebookId?: string | null,
): string {
  if (creatorSlug && ebookSlug) return `/${creatorSlug}/${ebookSlug}`;
  return `/ebook/${ebookId ?? ebookSlug ?? ''}`;
}

export function getSessionUrl(
  creatorSlug: string | null | undefined,
  sessionSlug: string | null | undefined,
  sessionId?: string | null,
): string {
  if (creatorSlug && sessionSlug) return `/${creatorSlug}/${sessionSlug}`;
  if (creatorSlug && sessionId) return `/c/${creatorSlug}/sesion/${sessionId}`;
  return `/`;
}

