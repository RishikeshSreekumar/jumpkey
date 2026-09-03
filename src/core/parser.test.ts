import { describe, expect, it } from "vitest";
import { parseInvocation } from "./parser";

describe("parseInvocation", () => {
  it("splits keyword and positional arguments on whitespace", () => {
    expect(parseInvocation("issue MandoHQ app 6091")).toEqual({
      keyword: "issue",
      args: ["MandoHQ", "app", "6091"],
    });
  });

  it("collapses runs of whitespace and trims", () => {
    expect(parseInvocation("  wf \t 123  ")).toEqual({ keyword: "wf", args: ["123"] });
  });

  it("lowercases the keyword but keeps arguments verbatim", () => {
    expect(parseInvocation("WF AbC")).toEqual({ keyword: "wf", args: ["AbC"] });
  });

  it("returns empty keyword for blank input", () => {
    expect(parseInvocation("   ")).toEqual({ keyword: "", args: [] });
  });
});

describe("parseInvocation quoting", () => {
  it("keeps spaces inside double quotes", () => {
    expect(parseInvocation('issue "my repo" 42')).toEqual({ keyword: "issue", args: ["my repo", "42"] });
  });

  it("treats an unterminated quote as running to the end", () => {
    expect(parseInvocation('wf "a b')).toEqual({ keyword: "wf", args: ["a b"] });
  });

  it("allows an empty quoted argument", () => {
    expect(parseInvocation('wf "" x')).toEqual({ keyword: "wf", args: ["", "x"] });
  });
});
