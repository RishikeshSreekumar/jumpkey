import type { Command, Usage } from "./types";

const enabled = (commands: readonly Command[]) => commands.filter((c) => c.enabled);

const aliasesOf = (c: Command) => (c.aliases ?? []).map((a) => a.toLowerCase());

export function findCommand(commands: readonly Command[], keyword: string): Command | undefined {
  const k = keyword.toLowerCase();
  return enabled(commands).find((c) => c.keyword === k || aliasesOf(c).includes(k));
}

export function filterCommands(commands: readonly Command[], input: string, usage: Usage = {}): Command[] {
  const q = (input.trim().split(/\s+/)[0] ?? "").toLowerCase();
  const list = enabled(commands);
  if (q === "") {
    return [...list].sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0));
  }
  const rank = (c: Command): number => {
    if (c.keyword.startsWith(q)) return 0;
    if (aliasesOf(c).some((a) => a.startsWith(q))) return 1;
    if (c.name.toLowerCase().includes(q)) return 2;
    return -1;
  };
  return list
    .map((c, i) => ({ c, i, r: rank(c) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.c);
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

export function closestKeyword(commands: readonly Command[], typed: string): string | undefined {
  const t = typed.toLowerCase();
  const candidates = enabled(commands).flatMap((c) => [c.keyword, ...aliasesOf(c)]);
  let best: { word: string; d: number } | undefined;
  for (const word of candidates) {
    const d = levenshtein(t, word);
    if (!best || d < best.d) best = { word, d };
  }
  if (!best) return undefined;
  const limit = t.length <= 3 ? 1 : 2;
  return best.d <= limit ? best.word : undefined;
}
