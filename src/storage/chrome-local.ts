import type { Usage } from "../core";
import { migrate, type Store } from "./schema";
import type { StoreRepository } from "./repository";

const KEY = "store";
const USAGE_KEY = "usage";

function asUsage(raw: unknown): Usage {
  if (!raw || typeof raw !== "object") return {};
  const out: Usage = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

export class ChromeLocalRepository implements StoreRepository {
  async load(): Promise<Store> {
    const result = await chrome.storage.local.get(KEY);
    return migrate(result[KEY]);
  }

  async save(store: Store): Promise<void> {
    await chrome.storage.local.set({ [KEY]: store });
  }

  subscribe(listener: (store: Store) => void): () => void {
    const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[KEY]) listener(migrate(changes[KEY].newValue));
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }

  async loadUsage(): Promise<Usage> {
    const result = await chrome.storage.local.get(USAGE_KEY);
    return asUsage(result[USAGE_KEY]);
  }

  async touchUsage(commandId: string): Promise<void> {
    const usage = await this.loadUsage();
    usage[commandId] = Date.now();
    await chrome.storage.local.set({ [USAGE_KEY]: usage });
  }
}
