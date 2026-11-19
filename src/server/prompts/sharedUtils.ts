import 'server-only';

/**
 * Escapes angle brackets to neutralize prompt-injection tag breaking
 * within untrusted external text (resume excerpts, job snippets, project notes).
 */
export function escapeXmlData(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

/**
 * Truncates and sanitizes untrusted input text for safe prompt interpolation.
 */
export function sanitizePromptInput(text: string | null | undefined, maxLength: number = 3000): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  const truncated = trimmed.length > maxLength ? trimmed.slice(0, maxLength) + '... [truncated]' : trimmed;
  return escapeXmlData(truncated);
}

/**
 * Formats an array of strings into a clean, comma-delimited list for prompt context.
 */
export function formatBulletList(items: string[] | undefined | null, fallback: string = 'None'): string {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return fallback;
  }
  const filtered = items.filter((item) => typeof item === 'string' && item.trim().length > 0);
  return filtered.length > 0 ? filtered.join(', ') : fallback;
}

/**
 * Wraps content in a structured XML-style tag block with appropriate injection safeguards.
 */
export function formatContextBlock(tagName: string, content: string | null | undefined, isUntrusted: boolean = true): string {
  if (!content || typeof content !== 'string' || !content.trim()) {
    return '';
  }
  const tag = isUntrusted ? `untrusted_${tagName}` : tagName;
  const processed = isUntrusted ? escapeXmlData(content) : content.trim();
  return `<${tag}>\n${processed}\n</${tag}>`;
}
