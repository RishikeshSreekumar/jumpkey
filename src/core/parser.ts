export type Invocation = {
  keyword: string;
  args: string[];
  tokens: string[];
};

export function parseInvocation(input: string): Invocation {
  const tokens = tokenize(input);
  const [first, ...args] = tokens;
  return { keyword: (first ?? "").toLowerCase(), args, tokens };
}

function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  let hasToken = false;
  for (const c of input) {
    if (inQuote) {
      if (c === '"') inQuote = false;
      else cur += c;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      hasToken = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (hasToken) out.push(cur);
      cur = "";
      hasToken = false;
      continue;
    }
    cur += c;
    hasToken = true;
  }
  if (hasToken) out.push(cur);
  return out;
}
