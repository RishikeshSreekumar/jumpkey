/**
 * Clipboard suggestion: decide whether copied text is worth offering as an Argument.
 * Pure; the popup does the actual reading.
 */

const MAX_LENGTH = 200;

/**
 * Normalize clipboard text to a single Argument, or null if it does not look like one.
 * Plausible = one line, no inner whitespace, 1–200 chars after trimming. Whole URLs are
 * rejected: they are destinations, not identifiers.
 */
export function clipboardArgument(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (t.length === 0 || t.length > MAX_LENGTH) return null;
  if (/\s/.test(t)) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return null;
  return t;
}

/** Middle-truncate a long value for display: `34173cdf-655a…c7b2beb8e`. */
export function shortValue(value: string, max = 28): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}
