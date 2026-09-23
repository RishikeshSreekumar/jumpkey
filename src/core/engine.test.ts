import { describe, expect, it } from "vitest";
import { assignArguments, MAX_TABS, recognize, resolveInvocation, selectionValues, usageLine } from "./engine";
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
  cmd("wf", "https://example.com/workflow/{id}"),
  cmd("issue", "https://github.com/{repo}/issues/{number}"),
];

describe("resolveInvocation", () => {
  it("resolves a complete invocation", () => {
    expect(resolveInvocation("issue app 6091", commands)).toEqual({
      ok: true,
      command: commands[1],
      args: { repo: "app", number: "6091" },
      url: "https://github.com/app/issues/6091",
      urls: ["https://github.com/app/issues/6091"],
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
    expect(resolveInvocation("issue app 1 2", commands)).toEqual({
      ok: false,
      kind: "too-many-arguments",
      command: commands[1],
      message: "Expected 2 arguments, received 3.",
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
      urls: ["https://x.com/one/two?q=th%20ree"],
    });
  });

  it("reuses one argument for a repeated variable", () => {
    const rep = [cmd("r", "https://x.com/{id}/edit/{id}")];
    expect(resolveInvocation("r 9", rep)).toMatchObject({ ok: true, url: "https://x.com/9/edit/9" });
  });
});

describe("optional and rest variables", () => {
  const pr = cmd("pr", "https://github.com/{repo=acme/web}/pull/{number}");
  const g = cmd("g", "https://www.google.com/search?q={query*}");
  const w = cmd("w", "https://{lang=en}.wikipedia.org/w/index.php?search={q*}");

  it("fills required variables first and uses defaults for the rest", () => {
    expect(resolveInvocation("pr 1297", [pr])).toMatchObject({ ok: true, url: "https://github.com/acme/web/pull/1297", args: { number: "1297" } });
  });

  it("fills optional variables in template order once required ones are covered", () => {
    expect(resolveInvocation("pr other/app 12", [pr])).toMatchObject({ ok: true, url: "https://github.com/other/app/pull/12" });
  });

  it("joins every remaining argument into a rest variable", () => {
    expect(resolveInvocation("g how to fold a map", [g])).toMatchObject({ ok: true, url: "https://www.google.com/search?q=how%20to%20fold%20a%20map" });
  });

  it("keeps defaults when a rest variable takes the extra words", () => {
    expect(resolveInvocation("w ada lovelace", [w])).toMatchObject({ ok: true, url: "https://en.wikipedia.org/w/index.php?search=ada%20lovelace" });
  });

  it("marks optional and rest variables in the usage line", () => {
    expect(usageLine(pr)).toBe("pr [repo] <number>");
    expect(usageLine(g)).toBe("g <query…>");
  });

  it("assigns partial input to required variables for the trail", () => {
    const specs = [{ name: "repo", default: "x/y" }, { name: "number" }];
    expect(assignArguments(specs, [])).toEqual({ given: [undefined, undefined], missing: specs[1], extra: 0 });
    expect(assignArguments(specs, ["5"])).toEqual({ given: [undefined, "5"], extra: 0 });
    expect(assignArguments(specs, ["a/b", "5", "6"])).toEqual({ given: ["a/b", "5"], extra: 1 });
  });
});

describe("several values", () => {
  const jira = { ...cmd("jira", "https://acme.atlassian.net/browse/{ticket}"), pattern: "[A-Z]+-\\d+" };
  const pr = { ...cmd("pr", "https://github.com/{repo=acme/web}/pull/{number}"), pattern: "\\d+" };

  it("opens one URL per value for a one-variable command", () => {
    expect(resolveInvocation("jira ENG-1 ENG-2 ENG-3", [jira])).toMatchObject({
      ok: true,
      url: "https://acme.atlassian.net/browse/ENG-1",
      urls: ["https://acme.atlassian.net/browse/ENG-1", "https://acme.atlassian.net/browse/ENG-2", "https://acme.atlassian.net/browse/ENG-3"],
    });
  });

  it("uses the pattern to tell several values from an optional override", () => {
    expect(resolveInvocation("pr 12 13", [pr])).toMatchObject({ ok: true, urls: ["https://github.com/acme/web/pull/12", "https://github.com/acme/web/pull/13"] });
    expect(resolveInvocation("pr other/app 13", [pr])).toMatchObject({ ok: true, urls: ["https://github.com/other/app/pull/13"] });
  });

  it("caps how many tabs one line can open", () => {
    const line = "jira " + Array.from({ length: MAX_TABS + 1 }, (_, i) => `A-${i}`).join(" ");
    expect(resolveInvocation(line, [jira])).toMatchObject({ ok: false, kind: "too-many-arguments" });
  });
});

describe("recognizing values without a keyword", () => {
  const jira = { ...cmd("jira", "https://acme.atlassian.net/browse/{ticket}"), pattern: "[A-Z][A-Z0-9]+-\\d+" };
  const linear = { ...cmd("lin", "https://linear.app/acme/issue/{issue}"), pattern: "[A-Z][A-Z0-9]+-\\d+" };
  const cus = { ...cmd("cus", "https://dashboard.stripe.com/customers/{id}"), pattern: "cus_[A-Za-z0-9]+" };
  const all = [jira, linear, cus];

  it("resolves a bare value to the first command whose pattern matches, listing the others", () => {
    const r = resolveInvocation("ENG-482", all);
    expect(r).toMatchObject({ ok: true, recognized: true, command: jira, url: "https://acme.atlassian.net/browse/ENG-482" });
    expect(r.ok && r.alternatives).toEqual([linear]);
  });

  it("matches case-insensitively and keeps the value as typed", () => {
    expect(resolveInvocation("eng-482", all)).toMatchObject({ ok: true, url: "https://acme.atlassian.net/browse/eng-482" });
  });

  it("recognizes several values when all match", () => {
    expect(resolveInvocation("cus_A1 cus_B2", all)).toMatchObject({ ok: true, command: cus, urls: ["https://dashboard.stripe.com/customers/cus_A1", "https://dashboard.stripe.com/customers/cus_B2"] });
    expect(resolveInvocation("cus_A1 ENG-1", all)).toMatchObject({ ok: false, kind: "unknown-command" });
  });

  it("prefers a keyword over a pattern", () => {
    const eng = cmd("eng-1", "https://x.com/");
    expect(resolveInvocation("eng-1", [jira, eng])).toMatchObject({ ok: true, command: eng });
  });

  it("ignores disabled commands and invalid patterns", () => {
    expect(recognize(["ENG-1"], [{ ...jira, enabled: false }, { ...linear, pattern: "([" }])).toEqual([]);
  });
});

describe("selectionValues", () => {
  const jira = { ...cmd("jira", "https://acme.atlassian.net/browse/{ticket}"), pattern: "[A-Z]+-\\d+" };
  const g = cmd("g", "https://www.google.com/search?q={query*}");
  const order = cmd("order", "https://x.com/orders/{id}");

  it("keeps only values matching the pattern", () => {
    expect(selectionValues(jira, "Blocked by ENG-1, ENG-2 and OPS-9.")).toEqual(["ENG-1", "ENG-2"]);
  });
  it("gives a rest variable the whole selection", () => {
    expect(selectionValues(g, "  how to fold a map ")).toEqual(["how to fold a map"]);
  });
  it("splits on whitespace and commas without a pattern", () => {
    expect(selectionValues(order, "5531, 5532")).toEqual(["5531", "5532"]);
  });
});
