/**
 * Template grammar (V0): a URL string containing `{name}` Variables.
 * Names are identifiers: [A-Za-z_][A-Za-z0-9_]*. No escapes, no nesting,
 * no `?`/`=` inside braces (reserved for optional/default syntax later).
 */

export const ALLOWED_SCHEMES = ["http:", "https:"] as const;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Where in the URL a Variable sits; decides how its Argument is encoded. */
type Place = "host" | "path" | "other";

type Segment = { kind: "literal"; text: string } | { kind: "variable"; name: string; place: Place };

export type ParseResult = { ok: true; variables: string[] } | { ok: false; error: string };

export type RenderResult = { ok: true; url: string } | { ok: false; error: string };

type SegmentResult = { ok: true; segments: Segment[] } | { ok: false; error: string };

/** Byte ranges of the host and path parts of the raw template, if any. */
function ranges(template: string): { host: [number, number]; path: [number, number] } | null {
  const schemeEnd = template.indexOf("://");
  if (schemeEnd === -1) return null;
  const hostStart = schemeEnd + 3;
  let hostEnd = template.length;
  for (let i = hostStart; i < template.length; i++) {
    const c = template[i];
    if (c === "/" || c === "?" || c === "#") {
      hostEnd = i;
      break;
    }
  }
  let pathEnd = template.length;
  for (let i = hostEnd; i < template.length; i++) {
    const c = template[i];
    if (c === "?" || c === "#") {
      pathEnd = i;
      break;
    }
  }
  return { host: [hostStart, hostEnd], path: [hostEnd, pathEnd] };
}

function placeOf(r: ReturnType<typeof ranges>, open: number, close: number): Place {
  if (!r) return "other";
  if (open >= r.host[0] && close < r.host[1]) return "host";
  if (open >= r.path[0] && close < r.path[1]) return "path";
  return "other";
}

function segment(template: string): SegmentResult {
  const r = ranges(template);
  const segments: Segment[] = [];
  let literal = "";
  let i = 0;
  while (i < template.length) {
    const c = template[i]!;
    if (c === "}") return { ok: false, error: `Unmatched "}" at position ${i}.` };
    if (c !== "{") {
      literal += c;
      i++;
      continue;
    }
    const close = template.indexOf("}", i + 1);
    if (close === -1) return { ok: false, error: `Unmatched "{" at position ${i}.` };
    const name = template.slice(i + 1, close);
    if (name.length === 0) return { ok: false, error: "Empty variable name `{}`." };
    if (!IDENT.test(name)) {
      return { ok: false, error: `Invalid variable name \`{${name}}\`. Use letters, digits and underscores.` };
    }
    if (literal) segments.push({ kind: "literal", text: literal });
    literal = "";
    segments.push({ kind: "variable", name, place: placeOf(r, i, close) });
    i = close + 1;
  }
  if (literal) segments.push({ kind: "literal", text: literal });
  return { ok: true, segments };
}

export function parseTemplate(template: string): ParseResult {
  const seg = segment(template);
  if (!seg.ok) return seg;
  const variables: string[] = [];
  for (const s of seg.segments) {
    if (s.kind === "variable" && !variables.includes(s.name)) variables.push(s.name);
  }
  return { ok: true, variables };
}

const HOST_SAFE = /^[A-Za-z0-9-]+$/;

/** Validate a rendered string as a navigable URL. Returns the normalized href. */
export function validateUrl(candidate: string): RenderResult {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "Not a valid URL." };
  }
  if (!(ALLOWED_SCHEMES as readonly string[]).includes(url.protocol)) {
    return { ok: false, error: `Scheme "${url.protocol}" is not allowed. Use http or https.` };
  }
  if (!url.hostname) return { ok: false, error: "URL has no host." };
  return { ok: true, url: url.href };
}

/**
 * Encode an Argument for its position. Path values keep `/` so that
 * `org/repo` or `a/b/c` can fill one Variable; everything else is fully encoded.
 */
function encode(value: string, place: Place): string {
  const enc = encodeURIComponent(value);
  return place === "path" ? enc.replace(/%2F/gi, "/") : enc;
}

export function renderTemplate(template: string, args: Record<string, string>): RenderResult {
  const seg = segment(template);
  if (!seg.ok) return seg;
  let out = "";
  for (const s of seg.segments) {
    if (s.kind === "literal") {
      out += s.text;
      continue;
    }
    const value = args[s.name];
    if (value === undefined) return { ok: false, error: `Missing argument for {${s.name}}.` };
    if (s.place === "host") {
      if (!HOST_SAFE.test(value)) {
        return { ok: false, error: `Argument for {${s.name}} is used in the host and may only contain letters, digits and hyphens.` };
      }
      out += value;
    } else {
      out += encode(value, s.place);
    }
  }
  return validateUrl(out);
}
