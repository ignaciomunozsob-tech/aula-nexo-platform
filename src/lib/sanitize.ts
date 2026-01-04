import DOMPurify from 'dompurify';

// Configure DOMPurify to allow only safe HTML tags
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Add rel="noopener noreferrer" to all links for security
  const sanitized = DOMPurify.sanitize(html, {
    ...SANITIZE_CONFIG,
    ADD_ATTR: ['target'],
  });
  
  // Post-process to add security attributes to links
  return sanitized.replace(/<a /g, '<a rel="noopener noreferrer" ');
}

/**
 * Sanitizes plain text and converts newlines to <br/> tags
 * @param text - Plain text to sanitize and convert
 * @returns Sanitized HTML string with line breaks
 */
export function sanitizeTextWithBreaks(text: string | null | undefined): string {
  if (!text) return '';
  
  // First escape HTML entities, then replace newlines
  const escaped = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return escaped.replace(/\n/g, '<br/>');
}
