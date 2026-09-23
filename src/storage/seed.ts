import type { Command } from "../core";

const SEEDED_KEY = "devSeeded";

export function devSeed(): Command[] {
  const now = Date.now();
  const mk = (keyword: string, name: string, template: string, aliases?: string[]): Command => ({
    id: crypto.randomUUID(),
    keyword,
    name,
    template,
    ...(aliases ? { aliases } : {}),
    openMode: "foreground-tab",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });
  return [
    mk("jira", "Jira ticket", "https://acme.atlassian.net/browse/{ticket}", ["j"]),
    mk("pr", "GitHub pull request", "https://github.com/{repo=facebook/react}/pull/{number}"),
    mk("g", "Google", "https://www.google.com/search?q={query*}"),
  ];
}

export async function shouldSeed(): Promise<boolean> {
  if (!import.meta.env.DEV) return false;
  const r = await chrome.storage.local.get(SEEDED_KEY);
  if (r[SEEDED_KEY]) return false;
  await chrome.storage.local.set({ [SEEDED_KEY]: true });
  return true;
}
