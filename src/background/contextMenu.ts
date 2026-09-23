import { requiredOf, resolveCommand, selectionValues, type Command } from "../core";
import { ChromeLocalRepository } from "../storage/chrome-local";
import { openUrls } from "../shared/open";

const PARENT_ID = "jumpkey";
const ITEM_PREFIX = "jumpkey:";

const repo = new ChromeLocalRepository();

const eligible = (commands: readonly Command[]) => commands.filter((c) => c.enabled && requiredOf(c).length === 1);

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

async function onClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  if (typeof info.menuItemId !== "string" || !info.menuItemId.startsWith(ITEM_PREFIX)) return;
  const id = info.menuItemId.slice(ITEM_PREFIX.length);
  const command = (await repo.load()).commands.find((c) => c.id === id);
  if (!command) return;
  const values = selectionValues(command, info.selectionText ?? "");
  if (values.length === 0) return;
  const urls: string[] = [];
  for (const v of values) {
    const r = resolveCommand(command, [v]);
    if (r.ok) urls.push(r.url);
  }
  if (urls.length === 0) return;
  await Promise.all([openUrls(urls, command.openMode, tab), repo.touchUsage(command.id)]);
}

// serialize rebuilds, overlapping removeAll/create calls race on ids
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
