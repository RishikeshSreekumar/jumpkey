import { closestKeyword, findCommand } from "./matcher";
import { parseInvocation } from "./parser";
import { parseTemplate, renderTemplate, type VariableSpec } from "./template";
import type { Command } from "./types";

export const MAX_TABS = 20;

export type Resolution =
  | {
      ok: true;
      command: Command;
      args: Record<string, string>;
      url: string;
      urls: string[];
      recognized?: boolean;
      alternatives?: Command[];
    }
  | { ok: false; kind: "empty" }
  | { ok: false; kind: "unknown-command"; keyword: string; message: string; suggestion?: string }
  | { ok: false; kind: "missing-argument"; command: Command; message: string; usage: string }
  | { ok: false; kind: "too-many-arguments"; command: Command; message: string }
  | { ok: false; kind: "invalid-url"; command: Command; message: string; detail: string };

export function specsOf(command: Command): VariableSpec[] {
  const parsed = parseTemplate(command.template);
  return parsed.ok ? parsed.specs : [];
}

export function variablesOf(command: Command): string[] {
  return specsOf(command).map((s) => s.name);
}

const isRequired = (s: VariableSpec) => s.default === undefined;

export function requiredOf(command: Command): VariableSpec[] {
  return specsOf(command).filter(isRequired);
}

export function formatUsageVariable(s: VariableSpec): string {
  if (s.rest) return `<${s.name}…>`;
  return isRequired(s) ? `<${s.name}>` : `[${s.name}]`;
}

export function usageLine(command: Command): string {
  return [command.keyword, ...specsOf(command).map(formatUsageVariable)].join(" ");
}

export function isMultiValue(command: Command): boolean {
  const specs = specsOf(command);
  const required = specs.filter(isRequired);
  return required.length === 1 && !required[0]!.rest;
}

const patternCache = new Map<string, RegExp | null>();

export function compilePattern(source: string): RegExp | null {
  if (!patternCache.has(source)) {
    let re: RegExp | null;
    try {
      re = new RegExp(`^(?:${source})$`, "i");
    } catch {
      re = null;
    }
    patternCache.set(source, re);
  }
  return patternCache.get(source)!;
}

export function matchesPattern(command: Command, value: string): boolean {
  if (!command.pattern) return false;
  return compilePattern(command.pattern)?.test(value) ?? false;
}

export function recognize(values: readonly string[], commands: readonly Command[]): Command[] {
  if (values.length === 0) return [];
  return commands.filter((c) => c.enabled && isMultiValue(c) && values.every((v) => matchesPattern(c, v)));
}

export type Assignment = {
  given: (string | undefined)[];
  missing?: VariableSpec;
  extra: number;
};

export function assignArguments(specs: readonly VariableSpec[], args: readonly string[]): Assignment {
  const given: (string | undefined)[] = specs.map(() => undefined);
  const required = specs.map((s, i) => ({ s, i })).filter((x) => isRequired(x.s));
  if (args.length <= required.length) {
    args.forEach((a, k) => (given[required[k]!.i] = a));
    const missing = required[args.length]?.s;
    return { given, extra: 0, ...(missing ? { missing } : {}) };
  }
  const rest = specs.findIndex((s) => s.rest);
  if (rest !== -1) {
    required.forEach((x, k) => (given[x.i] = x.i === rest ? args.slice(k).join(" ") : args[k]));
    return { given, extra: 0 };
  }
  const optional = specs.map((s, i) => ({ s, i })).filter((x) => !isRequired(x.s));
  const k = Math.min(args.length - required.length, optional.length);
  const chosen = [...required, ...optional.slice(0, k)].map((x) => x.i).sort((a, b) => a - b);
  chosen.forEach((i, n) => (given[i] = args[n]));
  return { given, extra: args.length - chosen.length };
}

function render(command: Command, values: Record<string, string>): { ok: true; url: string } | Resolution {
  const rendered = renderTemplate(command.template, values);
  if (rendered.ok) return rendered;
  return {
    ok: false,
    kind: "invalid-url",
    command,
    message: "Could not generate a valid URL. Check the command template.",
    detail: rendered.error,
  };
}

type Extras = { recognized?: boolean; alternatives?: Command[] };

export function resolveCommand(command: Command, args: readonly string[], extras: Extras = {}): Resolution {
  const specs = specsOf(command);

  const multi =
    isMultiValue(command) &&
    args.length > 1 &&
    (args.length > specs.length || (!!command.pattern && args.every((a) => matchesPattern(command, a))));
  if (multi) {
    if (args.length > MAX_TABS) {
      return { ok: false, kind: "too-many-arguments", command, message: `Up to ${MAX_TABS} values at once, received ${args.length}.` };
    }
    const name = specs.find(isRequired)!.name;
    const urls: string[] = [];
    for (const a of args) {
      const r = render(command, { [name]: a });
      if (!("url" in r)) return r;
      urls.push(r.url);
    }
    return { ok: true, command, args: { [name]: args[0]! }, url: urls[0]!, urls, ...extras };
  }

  const { given, missing, extra } = assignArguments(specs, args);
  if (missing) {
    return { ok: false, kind: "missing-argument", command, message: `Missing <${missing.name}>`, usage: usageLine(command) };
  }
  if (extra > 0) {
    const n = specs.length;
    const upTo = specs.some((s) => !isRequired(s)) ? "up to " : "";
    return {
      ok: false,
      kind: "too-many-arguments",
      command,
      message: `Expected ${upTo}${n} argument${n === 1 ? "" : "s"}, received ${args.length}.`,
    };
  }
  const values: Record<string, string> = {};
  specs.forEach((s, i) => {
    if (given[i] !== undefined) values[s.name] = given[i]!;
  });
  const r = render(command, values);
  if (!("url" in r)) return r;
  return { ok: true, command, args: values, url: r.url, urls: [r.url], ...extras };
}

export function resolveInvocation(input: string, commands: readonly Command[]): Resolution {
  const { keyword, args, tokens } = parseInvocation(input);
  if (keyword === "") return { ok: false, kind: "empty" };

  const command = findCommand(commands, keyword);
  if (command) return resolveCommand(command, args);

  const [first, ...others] = recognize(tokens, commands);
  if (first) return resolveCommand(first, tokens, { recognized: true, alternatives: others });

  const suggestion = closestKeyword(commands, keyword);
  return {
    ok: false,
    kind: "unknown-command",
    keyword,
    message: `No command \`${keyword}\`.`,
    ...(suggestion ? { suggestion } : {}),
  };
}

export function selectionValues(command: Command, text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (requiredOf(command)[0]?.rest) return [t];
  const parts = t.split(/[\s,;]+/).filter(Boolean);
  const matching = command.pattern ? parts.filter((p) => matchesPattern(command, p)) : [];
  const values = matching.length > 0 ? matching : parts;
  return values.slice(0, MAX_TABS);
}
