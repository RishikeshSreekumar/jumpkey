import type { Command } from "../core";

export const ORDER_KEY = "order";

export const SYNC_STATUS_KEY = "syncStatus";
export type SyncStatus = { ok: boolean; at: number; error?: string };
export const ITEM_PREFIX = "c:";

export type SyncItems = Record<string, unknown>;

export function toSyncItems(commands: readonly Command[]): SyncItems {
  const items: SyncItems = { [ORDER_KEY]: commands.map((c) => c.id) };
  for (const c of commands) items[ITEM_PREFIX + c.id] = c;
  return items;
}

const isCommand = (v: unknown): v is Command => {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return typeof c.id === "string" && typeof c.keyword === "string" && typeof c.template === "string";
};

export function fromSyncItems(items: SyncItems): Command[] {
  const byId = new Map<string, Command>();
  for (const [k, v] of Object.entries(items)) {
    if (k.startsWith(ITEM_PREFIX) && isCommand(v)) byId.set(v.id, v);
  }
  const order = Array.isArray(items[ORDER_KEY]) ? (items[ORDER_KEY] as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const out: Command[] = [];
  for (const id of order) {
    const c = byId.get(id);
    if (c && !out.includes(c)) out.push(c);
  }
  const orphans = [...byId.values()].filter((c) => !out.includes(c)).sort((a, b) => a.createdAt - b.createdAt);
  return [...out, ...orphans];
}

export function syncDiff(current: SyncItems, desired: SyncItems): { set: SyncItems; remove: string[] } {
  const set: SyncItems = {};
  for (const [k, v] of Object.entries(desired)) {
    if (JSON.stringify(current[k]) !== JSON.stringify(v)) set[k] = v;
  }
  const remove = Object.keys(current).filter((k) => k.startsWith(ITEM_PREFIX) && !(k in desired));
  return { set, remove };
}

export function mergeCommands(local: readonly Command[], remote: readonly Command[]): Command[] {
  const byId = new Map<string, Command>();
  for (const c of [...local, ...remote]) {
    const prev = byId.get(c.id);
    if (!prev || c.updatedAt > prev.updatedAt) byId.set(c.id, c);
  }
  const ids = [...new Set([...local, ...remote].map((c) => c.id))];
  const merged = ids.map((id) => byId.get(id)!);
  return merged.filter((c) => !merged.some((o) => o !== c && o.keyword === c.keyword && o.updatedAt > c.updatedAt));
}

export const sameCommands = (a: readonly Command[], b: readonly Command[]) => JSON.stringify(a) === JSON.stringify(b);
