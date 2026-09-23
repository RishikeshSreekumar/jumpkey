const MAX_LENGTH = 200;

export function clipboardArgument(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (t.length === 0 || t.length > MAX_LENGTH) return null;
  if (/\s/.test(t)) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return null;
  return t;
}

export function shortValue(value: string, max = 28): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}
