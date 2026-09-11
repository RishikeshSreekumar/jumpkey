import { renderTemplate, variablesOf, type Command, type NavTarget } from "../core";
import { ChromeLocalRepository } from "../storage/chrome-local";

/**
 * "Open with JumpKey" on selected text: one submenu entry per enabled Command with
 * exactly one Variable. The selection becomes that Argument. Rebuilt whenever
 * Commands or Preferences change; removed entirely when the preference is off.
 */

const PARENT_ID = "jumpkey";
const ITEM_PREFIX = "jumpkey:";

const repo = new ChromeLocalRepository();

const eligible = (commands: readonly Command[]) => commands.filter((c) => c.enabled && variablesOf(c).length === 1);

async function rebuild(): Promise<void> {
  await chrome.contextMenus.removeAll();
  const [store, prefs] = await Promise.all([repo.load(), repo.loadPreferences()]);
  if (!prefs.contextMenu) return;
  const list = eligible(store.commands);
  if (list.length === 0) return;
  chrome.contextMenus.create({ id: PARENT_ID, title: "Open with JumpKey", contexts: ["selection"] });
  for (const c of list) {
    chrome.contextMenus.create({ id: ITEM_PREFIX + c.id, parentId: PARENT_ID, title: c.name, contexts: ["selection"] });
  }
}

async function open(url: string, target: NavTarget, tab: chrome.tabs.Tab | undefined) {
  if (target === "current-tab" && tab?.id !== undefined) return chrome.tabs.update(tab.id, { url });
  return chrome.tabs.create({ url, active: target !== "background-tab", ...(tab?.index !== undefined ? { index: tab.index + 1 } : {}) });
}

async function onClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  if (typeof info.menuItemId !== "string" || !info.menuItemId.startsWith(ITEM_PREFIX)) return;
  const id = info.menuItemId.slice(ITEM_PREFIX.length);
  const value = (info.selectionText ?? "").trim();
  if (!value) return;
  const command = (await repo.load()).commands.find((c) => c.id === id);
  if (!command) return;
  const [variable] = variablesOf(command);
  if (!variable) return;
  const rendered = renderTemplate(command.template, { [variable]: value });
  if (!rendered.ok) return;
  await Promise.all([open(rendered.url, command.openMode, tab), repo.touchUsage(command.id)]);
}

// Rebuilds are serialized: two overlapping removeAll/create sequences would race on ids.
let chain: Promise<void> = Promise.resolve();
const schedule = () => {
  chain = chain.then(rebuild).catch((e: unknown) => console.warn("JumpKey context menu:", e));
};

export function registerContextMenu() {
  chrome.runtime.onInstalled.addListener(schedule);
  chrome.runtime.onStartup.addListener(schedule);
  repo.subscribe(schedule);
  repo.subscribePreferences(schedule);
  chrome.contextMenus.onClicked.addListener((info, tab) => void onClick(info, tab));
}
