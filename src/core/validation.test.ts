import { describe, expect, it } from "vitest";
import { normalizeDraft, normalizeTemplate, parseAliases, validateDraft } from "./validation";
import type { Command, CommandDraft } from "./types";

const existing: Command[] = [
  {
    id: "1",
    keyword: "wf",
    name: "Workflow",
    template: "https://x.com/{id}",
    aliases: ["workflow"],
    openMode: "current-tab",
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

const draft = (over: Partial<CommandDraft> = {}): CommandDraft => ({
  keyword: "asset",
  name: "Asset",
  template: "https://x.com/{id}/asset",
  openMode: "current-tab",
  ...over,
});

describe("normalizeTemplate", () => {
  it("prefixes https:// when scheme is absent", () => {
    expect(normalizeTemplate("joinmando.com/workflow/{id}")).toBe("https://joinmando.com/workflow/{id}");
  });
  it("leaves existing schemes alone", () => {
    expect(normalizeTemplate("http://localhost:3000/{id}")).toBe("http://localhost:3000/{id}");
  });
  it("trims whitespace", () => {
    expect(normalizeTemplate("  https://x.com/{id} ")).toBe("https://x.com/{id}");
  });
});

describe("validateDraft", () => {
  it("passes a good draft", () => {
    expect(validateDraft(draft(), existing)).toEqual({ errors: {}, warnings: [] });
  });

  it("blocks duplicate keyword", () => {
    expect(validateDraft(draft({ keyword: "wf" }), existing).errors.keyword).toBeDefined();
  });

  it("allows same keyword when editing that command", () => {
    expect(validateDraft(draft({ keyword: "wf" }), existing, "1").errors.keyword).toBeUndefined();
  });

  it("blocks invalid keyword charset", () => {
    expect(validateDraft(draft({ keyword: "As set" }), existing).errors.keyword).toBeDefined();
    expect(validateDraft(draft({ keyword: "1a" }), existing).errors.keyword).toBeDefined();
    expect(validateDraft(draft({ keyword: "" }), existing).errors.keyword).toBeDefined();
  });

  it("blocks empty name", () => {
    expect(validateDraft(draft({ name: " " }), existing).errors.name).toBeDefined();
  });

  it("blocks malformed braces", () => {
    expect(validateDraft(draft({ template: "https://x.com/{id" }), existing).errors.template).toBeDefined();
  });

  it("blocks disallowed scheme", () => {
    expect(validateDraft(draft({ template: "ftp://x.com/{id}" }), existing).errors.template).toBeDefined();
  });

  it("blocks unparseable URL", () => {
    expect(validateDraft(draft({ template: "https://" }), existing).errors.template).toBeDefined();
  });

  it("warns on zero variables", () => {
    const r = validateDraft(draft({ template: "https://x.com/" }), existing);
    expect(r.errors).toEqual({});
    expect(r.warnings.length).toBe(1);
  });
});

describe("aliases", () => {
  it("parseAliases splits on commas and whitespace, lowercases, dedupes", () => {
    expect(parseAliases(" Workflow, flow  wf2,flow ")).toEqual(["workflow", "flow", "wf2"]);
    expect(parseAliases("")).toEqual([]);
  });

  it("normalizeDraft drops an alias equal to the keyword and omits empty lists", () => {
    expect(normalizeDraft(draft({ keyword: "wf", aliases: ["WF", "flow"] })).aliases).toEqual(["flow"]);
    expect("aliases" in normalizeDraft(draft({ aliases: [] }))).toBe(false);
  });

  it("blocks an alias that is another command's keyword or alias", () => {
    expect(validateDraft(draft({ aliases: ["wf"] }), existing).errors.aliases).toBeDefined();
    expect(validateDraft(draft({ aliases: ["workflow"] }), existing).errors.aliases).toBeDefined();
    expect(validateDraft(draft({ aliases: ["workflow"] }), existing, "1").errors.aliases).toBeUndefined();
  });

  it("blocks a keyword that is another command's alias", () => {
    expect(validateDraft(draft({ keyword: "workflow" }), existing).errors.keyword).toBeDefined();
  });

  it("blocks malformed aliases", () => {
    expect(validateDraft(draft({ aliases: ["bad alias"] }), existing).errors.aliases).toBeDefined();
  });
});
