export type SlotRole = "host" | "path" | "query" | "hash";

export type UrlToken =
  | { kind: "sep"; text: string }
  | { kind: "slot"; text: string; role: SlotRole; key?: string };

export type Selection = ReadonlyMap<number, string>;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VARIABLE = /^\{([A-Za-z_][A-Za-z0-9_]*)(?:\*|=[^{}/]*)?\}$/;

function firstOf(s: string, chars: readonly string[], from: number): number {
  let best = s.length;
  for (const c of chars) {
    const i = s.indexOf(c, from);
    if (i !== -1 && i < best) best = i;
  }
  return best;
}

export function splitUrl(input: string): UrlToken[] | null {
  const schemeEnd = input.indexOf("://");
  if (schemeEnd <= 0) return null;
  const raw: UrlToken[] = [];
  const sep = (text: string) => {
    if (text) raw.push({ kind: "sep", text });
  };
  const slot = (text: string, role: SlotRole, key?: string) => {
    if (text) raw.push({ kind: "slot", text, role, ...(key !== undefined ? { key } : {}) });
  };

  sep(input.slice(0, schemeEnd + 3));
  const hostStart = schemeEnd + 3;
  const hostEnd = firstOf(input, ["/", "?", "#"], hostStart);
  const authority = input.slice(hostStart, hostEnd);
  if (!authority) return null;

  const at = authority.lastIndexOf("@");
  if (at !== -1) sep(authority.slice(0, at + 1));
  const hostPort = authority.slice(at + 1);
  const colon = hostPort.indexOf(":");
  const host = colon === -1 ? hostPort : hostPort.slice(0, colon);
  host.split(".").forEach((label, i) => {
    if (i > 0) sep(".");
    slot(label, "host");
  });
  if (colon !== -1) sep(hostPort.slice(colon));

  const pathEnd = firstOf(input, ["?", "#"], hostEnd);
  const path = input.slice(hostEnd, pathEnd);
  path.split("/").forEach((segment, i) => {
    if (i > 0) sep("/");
    slot(segment, "path");
  });

  const queryEnd = input.indexOf("#", pathEnd);
  const hashStart = queryEnd === -1 ? input.length : queryEnd;
  const query = input.slice(pathEnd, hashStart);
  if (query) {
    sep("?");
    query.slice(1).split("&").forEach((pair, i) => {
      if (i > 0) sep("&");
      const eq = pair.indexOf("=");
      if (eq === -1) sep(pair);
      else {
        sep(pair.slice(0, eq + 1));
        slot(pair.slice(eq + 1), "query", pair.slice(0, eq));
      }
    });
  }

  const hash = input.slice(hashStart);
  if (hash) {
    sep("#");
    hash.slice(1).split("/").forEach((segment, i) => {
      if (i > 0) sep("/");
      slot(segment, "hash");
    });
  }

  const out: UrlToken[] = [];
  for (const t of raw) {
    const last = out[out.length - 1];
    if (t.kind === "sep" && last?.kind === "sep") out[out.length - 1] = { kind: "sep", text: last.text + t.text };
    else out.push(t);
  }
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^[0-9a-f]{6,}$/i;
const DIGITS = /^\d+$/;
const OPAQUE = /^[A-Za-z0-9_-]{8,}$/;

export function looksLikeId(text: string): boolean {
  if (UUID.test(text) || DIGITS.test(text) || HEX.test(text)) return true;
  if (!OPAQUE.test(text)) return false;
  const digits = (text.match(/\d/g) ?? []).length;
  return digits >= 2;
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function identify(text: string): string | null {
  let s = safeDecode(text).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").replace(/^[0-9]+/, "");
  if (s.endsWith("ies") && s.length > 4) s = s.slice(0, -3) + "y";
  else if (s.endsWith("s") && !/(ss|us|is)$/.test(s) && s.length > 3) s = s.slice(0, -1);
  return IDENT.test(s) ? s : null;
}

function unique(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function suggestName(tokens: readonly UrlToken[], index: number, taken: ReadonlySet<string> = new Set()): string {
  const t = tokens[index];
  if (!t || t.kind !== "slot") return unique("arg", taken);
  let base: string | null = null;
  switch (t.role) {
    case "query":
      base = identify(t.key ?? "");
      break;
    case "host": {
      const labels = tokens.filter((x) => x.kind === "slot" && x.role === "host");
      const fromEnd = labels.length - 1 - labels.indexOf(t);
      base = fromEnd === 0 ? "tld" : fromEnd === 1 ? "domain" : "sub";
      break;
    }
    case "path":
    case "hash": {
      for (let i = index - 1; i >= 0; i--) {
        const p = tokens[i]!;
        if (p.kind !== "slot" || p.role !== t.role) continue;
        base = looksLikeId(p.text) ? null : identify(p.text);
        break;
      }
      if (!base) base = t.role === "hash" ? "hash" : "id";
    }
  }
  return unique(base ?? "arg", taken);
}

export function suggestVariables(tokens: readonly UrlToken[]): Map<number, string> {
  const out = new Map<number, string>();
  const taken = new Set<string>();
  tokens.forEach((t, i) => {
    if (t.kind !== "slot" || t.role === "host" || !looksLikeId(t.text)) return;
    const name = suggestName(tokens, i, taken);
    taken.add(name);
    out.set(i, name);
  });
  return out;
}

export function buildTemplate(tokens: readonly UrlToken[], selection: Selection): string {
  return tokens.map((t, i) => (t.kind === "slot" && selection.has(i) ? `{${selection.get(i)}}` : t.text)).join("");
}

export function alignTemplate(tokens: readonly UrlToken[], template: string): Map<number, string> | null {
  const parts = splitUrl(template);
  if (!parts || parts.length !== tokens.length) return null;
  const out = new Map<number, string>();
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]!;
    const b = parts[i]!;
    if (a.kind !== b.kind) return null;
    if (a.kind === "sep") {
      if (a.text !== b.text) return null;
      continue;
    }
    if (a.text === b.text) continue;
    const m = VARIABLE.exec(b.text);
    if (!m) return null;
    out.set(i, m[1]!);
  }
  return out;
}

export function displaySlot(text: string): string {
  return safeDecode(text);
}

export function nameFromTitle(title: string | undefined): string {
  if (!title) return "";
  const first = title.split(/\s+[-|·•–—]\s+/)[0] ?? title;
  return first.trim().slice(0, 48);
}
