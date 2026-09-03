import type { Command, CommandDraft } from "./types";
import { OPEN_MODES } from "./types";
import { normalizeDraft, validateDraft } from "./validation";

/**
 * Import/export format. Human-readable JSON, stable across versions:
 * { "schemaVersion": 1, "commands": [{ keyword, name, template, aliases?, openMode? }] }
 */
export const EXPORT_SCHEMA_VERSION = 1;

export type ExportFile = {
  schemaVersion: number;
  exportedAt: string;
  commands: CommandDraft[];
};

export function exportCommands(commands: readonly Command[]): string {
  const file: ExportFile = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    commands: commands.map((c) => ({
      keyword: c.keyword,
      name: c.name,
      template: c.template,
      openMode: c.openMode,
      ...(c.aliases && c.aliases.length > 0 ? { aliases: c.aliases } : {}),
    })),
  };
  return JSON.stringify(file, null, 2) + "\n";
}

export type ParsedImport =
  | { ok: true; commands: CommandDraft[]; rejected: string[] }
  | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Parse an export file. Invalid entries are dropped and reported, not fatal. */
export function parseImport(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  if (!isRecord(raw) || !Array.isArray(raw.commands)) {
    return { ok: false, error: 'File has no "commands" array.' };
  }
  const commands: CommandDraft[] = [];
  const rejected: string[] = [];
  raw.commands.forEach((entry, i) => {
    if (!isRecord(entry)) {
      rejected.push(`#${i + 1}: not an object`);
      return;
    }
    const draft = normalizeDraft({
      keyword: typeof entry.keyword === "string" ? entry.keyword : "",
      name: typeof entry.name === "string" ? entry.name : "",
      template: typeof entry.template === "string" ? entry.template : "",
      openMode: OPEN_MODES.includes(entry.openMode as never) ? (entry.openMode as CommandDraft["openMode"]) : "foreground-tab",
      aliases: Array.isArray(entry.aliases) ? entry.aliases.filter((a): a is string => typeof a === "string") : [],
    });
    // Validate in isolation; conflicts with existing Commands are resolved by mergeImport.
    const v = validateDraft(draft, []);
    const firstError = Object.values(v.errors)[0];
    if (firstError) {
      rejected.push(`${draft.keyword || `#${i + 1}`}: ${firstError}`);
      return;
    }
    if (commands.some((c) => c.keyword === draft.keyword)) {
      rejected.push(`${draft.keyword}: duplicated inside the file`);
      return;
    }
    commands.push(draft);
  });
  return { ok: true, commands, rejected };
}

export type ConflictStrategy = "skip" | "replace";

export type MergeResult = { commands: Command[]; added: number; replaced: number; skipped: number };

/** Merge imported drafts into existing Commands. Conflict = same Keyword. */
export function mergeImport(
  existing: readonly Command[],
  incoming: readonly CommandDraft[],
  strategy: ConflictStrategy,
  now = Date.now(),
  newId: () => string = () => crypto.randomUUID(),
): MergeResult {
  const commands = [...existing];
  let added = 0;
  let replaced = 0;
  let skipped = 0;
  for (const draft of incoming) {
    const idx = commands.findIndex((c) => c.keyword === draft.keyword);
    if (idx === -1) {
      commands.push({ id: newId(), ...draft, enabled: true, createdAt: now, updatedAt: now });
      added++;
    } else if (strategy === "replace") {
      commands[idx] = { ...commands[idx]!, ...draft, updatedAt: now };
      replaced++;
    } else {
      skipped++;
    }
  }
  return { commands, added, replaced, skipped };
}
