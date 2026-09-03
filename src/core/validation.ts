import { parseTemplate, renderTemplate } from "./template";
import type { Command, CommandDraft } from "./types";

export const KEYWORD_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

export type ValidationResult = {
  errors: Partial<Record<keyof CommandDraft, string>>;
  warnings: string[];
};

/** Trim and ensure a scheme. Called once on save so stored Templates are always explicit. */
export function normalizeTemplate(raw: string): string {
  const t = raw.trim();
  if (t === "") return t;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
}

/** Split a comma/space separated alias string into lowercase, de-duplicated tokens. */
export function parseAliases(raw: string): string[] {
  const out: string[] = [];
  for (const t of raw.split(/[\s,]+/)) {
    const a = t.trim().toLowerCase();
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

export function normalizeDraft(draft: CommandDraft): CommandDraft {
  const keyword = draft.keyword.trim().toLowerCase();
  const aliases = (draft.aliases ?? []).map((a) => a.trim().toLowerCase()).filter((a, i, arr) => a && a !== keyword && arr.indexOf(a) === i);
  return {
    keyword,
    name: draft.name.trim(),
    template: normalizeTemplate(draft.template),
    openMode: draft.openMode,
    ...(aliases.length > 0 ? { aliases } : {}),
  };
}

/**
 * Validate a (normalized) draft. `editingId` excludes that Command from the
 * duplicate-keyword check so a Command can be re-saved unchanged.
 */
export function validateDraft(draft: CommandDraft, existing: readonly Command[], editingId?: string): ValidationResult {
  const d = normalizeDraft(draft);
  const errors: ValidationResult["errors"] = {};
  const warnings: string[] = [];
  const others = existing.filter((c) => c.id !== editingId);
  const taken = (word: string) => others.find((c) => c.keyword === word || (c.aliases ?? []).includes(word));

  if (d.keyword === "") errors.keyword = "Keyword is required.";
  else if (!KEYWORD_PATTERN.test(d.keyword)) {
    errors.keyword = "Keyword must start with a letter and contain only lowercase letters, digits, - or _ (max 32).";
  } else {
    const clash = taken(d.keyword);
    if (clash) errors.keyword = `Keyword \`${d.keyword}\` is already used by ${clash.name}.`;
  }

  for (const a of d.aliases ?? []) {
    if (!KEYWORD_PATTERN.test(a)) {
      errors.aliases = `Alias \`${a}\` must start with a letter and contain only lowercase letters, digits, - or _.`;
      break;
    }
    const clash = taken(a);
    if (clash) {
      errors.aliases = `Alias \`${a}\` is already used by ${clash.name}.`;
      break;
    }
  }

  if (d.name === "") errors.name = "Name is required.";

  if (d.template === "") errors.template = "URL template is required.";
  else {
    const parsed = parseTemplate(d.template);
    if (!parsed.ok) errors.template = parsed.error;
    else {
      const dummy = Object.fromEntries(parsed.variables.map((v) => [v, "x"]));
      const rendered = renderTemplate(d.template, dummy);
      if (!rendered.ok) errors.template = rendered.error;
      else if (parsed.variables.length === 0) warnings.push("Template has no variables; this command will always open the same URL.");
    }
  }

  return { errors, warnings };
}
