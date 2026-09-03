import { closestKeyword, findCommand } from "./matcher";
import { parseInvocation } from "./parser";
import { parseTemplate, renderTemplate } from "./template";
import type { Command } from "./types";

export type Resolution =
  | { ok: true; command: Command; args: Record<string, string>; url: string }
  | { ok: false; kind: "empty" }
  | { ok: false; kind: "unknown-command"; keyword: string; message: string; suggestion?: string }
  | { ok: false; kind: "missing-argument"; command: Command; message: string; usage: string }
  | { ok: false; kind: "too-many-arguments"; command: Command; message: string }
  | { ok: false; kind: "invalid-url"; command: Command; message: string; detail: string };

export function variablesOf(command: Command): string[] {
  const parsed = parseTemplate(command.template);
  return parsed.ok ? parsed.variables : [];
}

export function usageLine(command: Command): string {
  return [command.keyword, ...variablesOf(command).map((v) => `<${v}>`)].join(" ");
}

/** The whole core in one call: Invocation text + Commands → URL or a user-facing error. */
export function resolveInvocation(input: string, commands: readonly Command[]): Resolution {
  const { keyword, args } = parseInvocation(input);
  if (keyword === "") return { ok: false, kind: "empty" };

  const command = findCommand(commands, keyword);
  if (!command) {
    const suggestion = closestKeyword(commands, keyword);
    return {
      ok: false,
      kind: "unknown-command",
      keyword,
      message: `No command \`${keyword}\`.`,
      ...(suggestion ? { suggestion } : {}),
    };
  }

  const variables = variablesOf(command);
  if (args.length < variables.length) {
    const missing = variables[args.length]!;
    return { ok: false, kind: "missing-argument", command, message: `Missing <${missing}>`, usage: usageLine(command) };
  }
  if (args.length > variables.length) {
    const n = variables.length;
    return {
      ok: false,
      kind: "too-many-arguments",
      command,
      message: `Expected ${n} argument${n === 1 ? "" : "s"}, received ${args.length}.`,
    };
  }

  const values = Object.fromEntries(variables.map((v, i) => [v, args[i]!]));
  const rendered = renderTemplate(command.template, values);
  if (!rendered.ok) {
    return {
      ok: false,
      kind: "invalid-url",
      command,
      message: "Could not generate a valid URL. Check the command template.",
      detail: rendered.error,
    };
  }
  return { ok: true, command, args: values, url: rendered.url };
}
