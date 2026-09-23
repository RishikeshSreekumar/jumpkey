import { describe, expect, it } from "vitest";
import { closestKeyword, filterCommands, findCommand } from "./matcher";
import type { Command } from "./types";

const cmd = (keyword: string, extra: Partial<Command> = {}): Command => ({
  id: keyword,
  keyword,
  name: keyword,
  template: "https://x.com/{id}",
  openMode: "current-tab",
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const commands = [
  cmd("wf", { aliases: ["workflow"] }),
  cmd("asset"),
  cmd("issue", { enabled: false }),
  cmd("sn", { name: "Sentry Issue" }),
];

describe("findCommand", () => {
  it("matches exact keyword", () => {
    expect(findCommand(commands, "wf")?.id).toBe("wf");
  });
  it("matches alias", () => {
    expect(findCommand(commands, "workflow")?.id).toBe("wf");
  });
  it("does not match prefix", () => {
    expect(findCommand(commands, "as")).toBeUndefined();
  });
  it("ignores disabled commands", () => {
    expect(findCommand(commands, "issue")).toBeUndefined();
  });
});

describe("filterCommands", () => {
  it("returns all enabled commands for empty input, in stored order without usage", () => {
    expect(filterCommands(commands, "").map((c) => c.id)).toEqual(["wf", "asset", "sn"]);
  });
  it("puts most recently used first for empty input", () => {
    expect(filterCommands(commands, "", { sn: 50, asset: 100 }).map((c) => c.id)).toEqual(["asset", "sn", "wf"]);
  });
  it("filters by keyword prefix, case-insensitively", () => {
    expect(filterCommands(commands, "AS").map((c) => c.id)).toEqual(["asset"]);
  });
  it("matches alias prefix and name substring, ranked after keyword prefix", () => {
    expect(filterCommands(commands, "work").map((c) => c.id)).toEqual(["wf"]);
    expect(filterCommands(commands, "sentry").map((c) => c.id)).toEqual(["sn"]);
    expect(filterCommands(commands, "s").map((c) => c.id)).toEqual(["sn", "asset"]);
  });
  it("ignores usage when there is a query", () => {
    expect(filterCommands(commands, "s", { asset: 100 }).map((c) => c.id)).toEqual(["sn", "asset"]);
  });
  it("uses only the keyword token of a partial invocation", () => {
    expect(filterCommands(commands, "wf 12").map((c) => c.id)).toEqual(["wf"]);
  });
});

describe("closestKeyword", () => {
  it("suggests a near keyword or alias", () => {
    expect(closestKeyword(commands, "asst")).toBe("asset");
    expect(closestKeyword(commands, "workflw")).toBe("workflow");
  });
  it("is stricter for very short input", () => {
    expect(closestKeyword(commands, "wg")).toBe("wf");
    expect(closestKeyword(commands, "xy")).toBeUndefined();
  });
  it("returns nothing when nothing is close", () => {
    expect(closestKeyword(commands, "deployment")).toBeUndefined();
    expect(closestKeyword([], "wf")).toBeUndefined();
  });
  it("ignores disabled commands", () => {
    expect(closestKeyword(commands, "issu")).toBeUndefined();
  });
});
