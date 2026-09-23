import type { NavTarget } from "../core";
import { ChromeLocalRepository } from "../storage/chrome-local";

export const TABS_PERMISSION = { permissions: ["tabs" as const] };

const repo = new ChromeLocalRepository();

function key(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
    return u.href;
  } catch {
    return url;
  }
}

async function openTabs(): Promise<Map<string, chrome.tabs.Tab>> {
  const out = new Map<string, chrome.tabs.Tab>();
  const prefs = await repo.loadPreferences();
  if (!prefs.switchToOpenTab || !(await chrome.permissions.contains(TABS_PERMISSION))) return out;
  for (const t of await chrome.tabs.query({})) {
    const u = t.url || t.pendingUrl;
    if (u && t.id !== undefined && !out.has(key(u))) out.set(key(u), t);
  }
  return out;
}

export async function openUrls(urls: readonly string[], target: NavTarget, from?: chrome.tabs.Tab): Promise<void> {
  const existing = await openTabs();
  const source = from ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let index = source?.index;

  for (const [n, url] of urls.entries()) {
    const found = existing.get(key(url));
    const first = n === 0;
    if (found?.id !== undefined) {
      if (first && target !== "background-tab") {
        await chrome.tabs.update(found.id, { active: true });
        if (found.windowId !== undefined) await chrome.windows.update(found.windowId, { focused: true });
      }
      continue;
    }
    if (first && target === "current-tab" && source?.id !== undefined) {
      await chrome.tabs.update(source.id, { url });
      continue;
    }
    const active = first && target !== "background-tab";
    const tab = await chrome.tabs.create({
      url,
      active,
      ...(source?.windowId !== undefined ? { windowId: source.windowId } : {}),
      ...(index !== undefined ? { index: index + 1 } : {}),
    });
    index = tab.index;
  }
}
