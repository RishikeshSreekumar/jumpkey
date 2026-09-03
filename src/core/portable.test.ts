import { describe, expect, it } from "vitest";
import { exportCommands, mergeImport, parseImport } from "./portable";
import type { Command } from "./types";

const cmd = (keyword: string, extra: Partial<Command> = {}): Command => ({
  id: `id-${keyword}`,
  keyword,
  name: keyword.toUpperCase(),
  template: `https://x.com/${keyword}/{id}`,
  openMode: "foreground-tab",
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

describe("exportCommands", () => {
  it("writes only user-editable fields, omitting empty aliases", () => {
    const json = JSON.parse(exportCommands([cmd("wf", { aliases: ["workflow"] }), cmd("asset")]));
    expect(json.schemaVersion).toBe(1);
    expect(json.commands).toEqual([
      { keyword: "wf", name: "WF", template: "https://x.com/wf/{id}", openMode: "foreground-tab", aliases: ["workflow"] },
      { keyword: "asset", name: "ASSET", template: "https://x.com/asset/{id}", openMode: "foreground-tab" },
    ]);
  });

  it("round-trips through parseImport", () => {
    const r = parseImport(exportCommands([cmd("wf", { aliases: ["workflow"] })]));
    expect(r).toEqual({
      ok: true,
      rejected: [],
      commands: [{ keyword: "wf", name: "WF", template: "https://x.com/wf/{id}", openMode: "foreground-tab", aliases: ["workflow"] }],
    });
  });
});

describe("parseImport", () => {
  it("rejects non-JSON and missing commands array", () => {
    expect(parseImport("nope")).toMatchObject({ ok: false });
    expect(parseImport('{"foo": 1}')).toMatchObject({ ok: false });
  });

  it("normalizes loose entries and defaults openMode", () => {
    const r = parseImport('{"commands":[{"keyword":" WF ","name":"Workflow","template":"x.com/{id}"}]}');
    expect(r).toEqual({
      ok: true,
      rejected: [],
      commands: [{ keyword: "wf", name: "Workflow", template: "https://x.com/{id}", openMode: "foreground-tab" }],
    });
  });

  it("drops invalid entries and in-file duplicates, reporting each", () => {
    const r = parseImport(
      JSON.stringify({
        commands: [
          { keyword: "ok", name: "Ok", template: "https://x.com/{id}" },
          { keyword: "bad key", name: "Bad", template: "https://x.com/{id}" },
          { keyword: "ok", name: "Dup", template: "https://x.com/{id}" },
          "garbage",
        ],
      }),
    );
    expect(r.ok && r.commands.map((c) => c.keyword)).toEqual(["ok"]);
    expect(r.ok && r.rejected.length).toBe(3);
  });
});

describe("mergeImport", () => {
  const existing = [cmd("wf"), cmd("asset")];
  const incoming = [
    { keyword: "wf", name: "New WF", template: "https://y.com/{id}", openMode: "current-tab" as const },
    { keyword: "logs", name: "Logs", template: "https://y.com/logs/{id}", openMode: "foreground-tab" as const },
  ];

  it("skips conflicts by default", () => {
    const r = mergeImport(existing, incoming, "skip", 5, () => "new");
    expect(r).toMatchObject({ added: 1, replaced: 0, skipped: 1 });
    expect(r.commands.map((c) => c.keyword)).toEqual(["wf", "asset", "logs"]);
    expect(r.commands[0]!.name).toBe("WF");
    expect(r.commands[2]).toMatchObject({ id: "new", enabled: true, createdAt: 5, updatedAt: 5 });
  });

  it("replaces conflicts in place, keeping id and createdAt", () => {
    const r = mergeImport(existing, incoming, "replace", 5, () => "new");
    expect(r).toMatchObject({ added: 1, replaced: 1, skipped: 0 });
    expect(r.commands[0]).toMatchObject({ id: "id-wf", name: "New WF", openMode: "current-tab", createdAt: 0, updatedAt: 5 });
  });
});
