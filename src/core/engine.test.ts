import { describe, expect, it } from "vitest";
import { resolveInvocation, usageLine } from "./engine";
import type { Command } from "./types";

const cmd = (keyword: string, template: string): Command => ({
  id: keyword,
  keyword,
  name: keyword,
  template,
  openMode: "foreground-tab",
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
});

const commands = [
  cmd("wf", "https://joinmando.com/workflow/{id}"),
  cmd("issue", "https://github.com/{repo}/issues/{number}"),
];

describe("resolveInvocation", () => {
  it("resolves a complete invocation", () => {
    expect(resolveInvocation("issue app 6091", commands)).toEqual({
      ok: true,
      command: commands[1],
      args: { repo: "app", number: "6091" },
      url: "https://github.com/app/issues/6091",
    });
  });

  it("reports empty input", () => {
    expect(resolveInvocation("", commands)).toEqual({ ok: false, kind: "empty" });
  });

  it("reports unknown command with a suggestion when one is close", () => {
    expect(resolveInvocation("isue 123", commands)).toEqual({
      ok: false,
      kind: "unknown-command",
      keyword: "isue",
      message: "No command `isue`.",
      suggestion: "issue",
    });
    expect(resolveInvocation("deploy 123", commands)).toEqual({
      ok: false,
      kind: "unknown-command",
      keyword: "deploy",
      message: "No command `deploy`.",
    });
  });

  it("reports missing argument with usage", () => {
    expect(resolveInvocation("issue app", commands)).toEqual({
      ok: false,
      kind: "missing-argument",
      command: commands[1],
      message: "Missing <number>",
      usage: "issue <repo> <number>",
    });
  });

  it("reports too many arguments", () => {
    expect(resolveInvocation("wf 123 abc", commands)).toEqual({
      ok: false,
      kind: "too-many-arguments",
      command: commands[0],
      message: "Expected 1 argument, received 2.",
    });
  });

  it("reports render failures", () => {
    const bad = [cmd("env", "https://{env}.x.com/")];
    expect(resolveInvocation("env a/b", bad)).toMatchObject({
      ok: false,
      kind: "invalid-url",
      message: "Could not generate a valid URL. Check the command template.",
    });
  });
});

describe("usageLine", () => {
  it("renders keyword with angle-bracketed variables", () => {
    expect(usageLine(commands[1]!)).toBe("issue <repo> <number>");
  });
  it("renders bare keyword when template has no variables", () => {
    expect(usageLine(cmd("home", "https://x.com/"))).toBe("home");
  });
});

describe("resolveInvocation with several arguments", () => {
  it("fills three variables in order and encodes each", () => {
    const three = [cmd("q", "https://x.com/{a}/{b}?q={c}")];
    expect(resolveInvocation("q one two th ree", three)).toMatchObject({ ok: false, kind: "too-many-arguments" });
    expect(resolveInvocation('q one two "th ree"', three)).toEqual({
      ok: true,
      command: three[0],
      args: { a: "one", b: "two", c: "th ree" },
      url: "https://x.com/one/two?q=th%20ree",
    });
  });

  it("reuses one argument for a repeated variable", () => {
    const rep = [cmd("r", "https://x.com/{id}/edit/{id}")];
    expect(resolveInvocation("r 9", rep)).toMatchObject({ ok: true, url: "https://x.com/9/edit/9" });
  });
});
