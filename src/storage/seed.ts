import type { Command } from "../core";

const SEEDED_KEY = "devSeeded";

/** Dev-only sample Commands. Never shipped in production builds. */
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
    mk("wf", "Workflow", "https://joinmando.com/workflow/{id}", ["workflow"]),
    mk("asset", "Asset Editor", "https://joinmando.com/workflow/{id}/asset-editor"),
    mk("issue", "GitHub Issue", "https://github.com/{repo}/issues/{id}"),
  ];
}

/** True at most once per profile, so deleting all commands in dev does not reseed. */
export async function shouldSeed(): Promise<boolean> {
  if (!import.meta.env.DEV) return false;
  const r = await chrome.storage.local.get(SEEDED_KEY);
  if (r[SEEDED_KEY]) return false;
  await chrome.storage.local.set({ [SEEDED_KEY]: true });
  return true;
}
