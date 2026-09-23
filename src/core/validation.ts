import { compilePattern } from "./engine";
import { parseTemplate, renderTemplate } from "./template";
import type { Command, CommandDraft } from "./types";

export const KEYWORD_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

const MAX_PATTERN = 200;

export type ValidationResult = {
  errors: Partial<Record<keyof CommandDraft, string>>;
  warnings: string[];
};

function oneValue(template: string): boolean {
  const p = parseTemplate(template);
  if (!p.ok) return false;
  const required = p.specs.filter((s) => s.default === undefined);
  return required.length === 1 && !required[0]!.rest;
}

export function normalizeTemplate(raw: string): string {
  const t = raw.trim();
  if (t === "") return t;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
}

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
  const pattern = (draft.pattern ?? "").trim();
  return {
    keyword,
    name: draft.name.trim(),
    template: normalizeTemplate(draft.template),
    openMode: draft.openMode,
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(pattern ? { pattern } : {}),
  };
}

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
      const withDefaults = renderTemplate(d.template, Object.fromEntries(parsed.specs.filter((s) => s.default === undefined).map((s) => [s.name, "x"])));
      if (!rendered.ok) errors.template = rendered.error;
      else if (!withDefaults.ok) errors.template = `Default value: ${withDefaults.error}`;
      else if (parsed.variables.length === 0) warnings.push("Template has no variables; this command will always open the same URL.");
    }
  }

  if (d.pattern) {
    if (d.pattern.length > MAX_PATTERN) errors.pattern = `Pattern is too long (max ${MAX_PATTERN} characters).`;
    else if (!compilePattern(d.pattern)) errors.pattern = "Pattern is not a valid regular expression.";
    else if (compilePattern(d.pattern)!.test("")) errors.pattern = "Pattern matches empty text; make it more specific.";
    else if (!oneValue(d.template)) {
      warnings.push("Recognizing values only works when the template has exactly one required variable.");
    }
  }

  return { errors, warnings };
}
