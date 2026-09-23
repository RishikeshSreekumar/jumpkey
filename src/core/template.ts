export const ALLOWED_SCHEMES = ["http:", "https:"] as const;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Place = "host" | "path" | "other";

export type VariableSpec = { name: string; default?: string; rest?: boolean };

type Segment = { kind: "literal"; text: string } | { kind: "variable"; name: string; place: Place; spec: VariableSpec };

export type ParseResult = { ok: true; variables: string[]; specs: VariableSpec[] } | { ok: false; error: string };

export type RenderResult = { ok: true; url: string } | { ok: false; error: string };

type SegmentResult = { ok: true; segments: Segment[] } | { ok: false; error: string };

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

function parseSpec(body: string): VariableSpec | null {
  const eq = body.indexOf("=");
  if (eq !== -1) {
    const name = body.slice(0, eq);
    return IDENT.test(name) ? { name, default: body.slice(eq + 1) } : null;
  }
  if (body.endsWith("*")) {
    const name = body.slice(0, -1);
    return IDENT.test(name) ? { name, rest: true } : null;
  }
  return IDENT.test(body) ? { name: body } : null;
}

const isBare = (s: VariableSpec) => s.default === undefined && !s.rest;
const sameSpec = (a: VariableSpec, b: VariableSpec) => a.default === b.default && !!a.rest === !!b.rest;

export function formatSpec(spec: VariableSpec): string {
  if (spec.rest) return `{${spec.name}*}`;
  if (spec.default !== undefined) return `{${spec.name}=${spec.default}}`;
  return `{${spec.name}}`;
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
    const body = template.slice(i + 1, close);
    if (body.length === 0) return { ok: false, error: "Empty variable name `{}`." };
    if (body.includes("{")) return { ok: false, error: `Unmatched "{" at position ${i}.` };
    const spec = parseSpec(body);
    if (!spec) {
      return { ok: false, error: `Invalid variable \`{${body}}\`. Use {name}, {name=default} or {name*}; names are letters, digits and underscores.` };
    }
    if (literal) segments.push({ kind: "literal", text: literal });
    literal = "";
    segments.push({ kind: "variable", name: spec.name, place: placeOf(r, i, close), spec });
    i = close + 1;
  }
  if (literal) segments.push({ kind: "literal", text: literal });
  return { ok: true, segments };
}

export function parseTemplate(template: string): ParseResult {
  const seg = segment(template);
  if (!seg.ok) return seg;
  const specs: VariableSpec[] = [];
  for (const s of seg.segments) {
    if (s.kind !== "variable") continue;
    const first = specs.find((x) => x.name === s.name);
    if (!first) specs.push(s.spec);
    else if (!isBare(s.spec) && !sameSpec(first, s.spec)) {
      return { ok: false, error: `Variable {${s.name}} is declared twice with different defaults.` };
    }
  }
  const restAt = specs.findIndex((x) => x.rest);
  if (restAt !== -1 && restAt !== specs.length - 1) {
    return { ok: false, error: `Only the last variable can take the rest of the line ({${specs[restAt]!.name}*}).` };
  }
  return { ok: true, variables: specs.map((x) => x.name), specs };
}

export function setVariableSpec(template: string, spec: VariableSpec): string {
  let seen = false;
  return template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)(\*|=[^{}]*)?\}/g, (whole, name: string) => {
    if (name !== spec.name) return whole;
    const out = seen ? `{${name}}` : formatSpec(spec);
    seen = true;
    return out;
  });
}

const HOST_SAFE = /^[A-Za-z0-9-]+$/;

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
    const value = args[s.name] ?? s.spec.default;
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
