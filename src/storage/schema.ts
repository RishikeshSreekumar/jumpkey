import type { Command } from "../core";

export const CURRENT_SCHEMA_VERSION = 1;

export type Store = {
  schemaVersion: number;
  commands: Command[];
};

export function emptyStore(): Store {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, commands: [] };
}

type Migration = (store: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, Migration> = {};

export function migrate(raw: unknown): Store {
  if (!raw || typeof raw !== "object") return emptyStore();
  let store = raw as Record<string, unknown>;
  let version = typeof store.schemaVersion === "number" ? store.schemaVersion : 1;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new Error(`No migration from schema v${version}`);
    store = step(store);
    version++;
    store.schemaVersion = version;
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    commands: Array.isArray(store.commands) ? (store.commands as Command[]) : [],
  };
}
