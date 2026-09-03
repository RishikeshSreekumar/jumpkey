export type Invocation = { keyword: string; args: string[] };

/**
 * Split an Invocation line into a lowercased Keyword and verbatim positional Arguments.
 * Arguments are whitespace-separated; wrap an Argument in double quotes to keep spaces
 * inside it (`issue "my repo" 42`).
 */
export function parseInvocation(input: string): Invocation {
  const tokens = tokenize(input);
  const [first, ...args] = tokens;
  return { keyword: (first ?? "").toLowerCase(), args };
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
