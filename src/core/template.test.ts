import { describe, expect, it } from "vitest";
import { parseTemplate, renderTemplate } from "./template";

describe("parseTemplate", () => {
  it("extracts variables in order of first appearance", () => {
    const r = parseTemplate("https://github.com/{org}/{repo}/issues/{number}");
    expect(r).toEqual({ ok: true, variables: ["org", "repo", "number"] });
  });

  it("dedupes repeated variables", () => {
    const r = parseTemplate("https://example.com/{id}/compare/{id}");
    expect(r).toEqual({ ok: true, variables: ["id"] });
  });

  it("accepts templates with no variables", () => {
    expect(parseTemplate("https://example.com/")).toEqual({ ok: true, variables: [] });
  });

  it("rejects unmatched opening brace", () => {
    expect(parseTemplate("https://x.com/{id")).toMatchObject({ ok: false });
  });

  it("rejects unmatched closing brace", () => {
    expect(parseTemplate("https://x.com/id}")).toMatchObject({ ok: false });
  });

  it("rejects empty variable name", () => {
    expect(parseTemplate("https://x.com/{}")).toMatchObject({ ok: false });
  });

  it("rejects non-identifier variable names, reserving ? and = for later syntax", () => {
    expect(parseTemplate("https://x.com/{tab?}")).toMatchObject({ ok: false });
    expect(parseTemplate("https://x.com/{env=prod}")).toMatchObject({ ok: false });
    expect(parseTemplate("https://x.com/{1x}")).toMatchObject({ ok: false });
    expect(parseTemplate("https://x.com/{a b}")).toMatchObject({ ok: false });
  });

  it("rejects nested braces", () => {
    expect(parseTemplate("https://x.com/{{id}}")).toMatchObject({ ok: false });
  });
});

describe("renderTemplate", () => {
  it("substitutes path variables", () => {
    const r = renderTemplate("https://joinmando.com/workflow/{id}/asset-editor", { id: "7f4c2a" });
    expect(r).toEqual({ ok: true, url: "https://joinmando.com/workflow/7f4c2a/asset-editor" });
  });

  it("substitutes repeated variables with the same value", () => {
    const r = renderTemplate("https://x.com/{id}/compare/{id}", { id: "a" });
    expect(r).toEqual({ ok: true, url: "https://x.com/a/compare/a" });
  });

  it("percent-encodes spaces in path arguments but keeps slashes", () => {
    expect(renderTemplate("https://x.com/q/{q}", { q: "hello world" })).toEqual({
      ok: true,
      url: "https://x.com/q/hello%20world",
    });
    expect(renderTemplate("https://github.com/{repo}/issues/{n}", { repo: "MandoHQ/app", n: "1" })).toEqual({
      ok: true,
      url: "https://github.com/MandoHQ/app/issues/1",
    });
    expect(renderTemplate("https://x.com/q/{q}", { q: "a?b#c" })).toEqual({
      ok: true,
      url: "https://x.com/q/a%3Fb%23c",
    });
  });

  it("still encodes slashes in query and hash arguments", () => {
    expect(renderTemplate("https://x.com/s?q={q}", { q: "a/b" })).toEqual({ ok: true, url: "https://x.com/s?q=a%2Fb" });
    expect(renderTemplate("https://x.com/p#{s}", { s: "a/b" })).toEqual({ ok: true, url: "https://x.com/p#a%2Fb" });
  });

  it("encodes query string values", () => {
    expect(renderTemplate("https://x.com/s?q={q}&tab={tab}", { q: "a&b=c", tab: "t" })).toEqual({
      ok: true,
      url: "https://x.com/s?q=a%26b%3Dc&tab=t",
    });
  });

  it("encodes hash fragment values", () => {
    expect(renderTemplate("https://x.com/p#{sec}", { sec: "a b" })).toEqual({
      ok: true,
      url: "https://x.com/p#a%20b",
    });
  });

  it("allows host-position variables with safe characters", () => {
    expect(renderTemplate("https://{env}.example.com/w/{id}", { env: "staging", id: "1" })).toEqual({
      ok: true,
      url: "https://staging.example.com/w/1",
    });
  });

  it("rejects host-position arguments with unsafe characters", () => {
    expect(renderTemplate("https://{env}.example.com/", { env: "a/b" })).toMatchObject({ ok: false });
    expect(renderTemplate("https://{env}.example.com/", { env: "a.b" })).toMatchObject({ ok: false });
  });

  it("fails when an argument is missing", () => {
    expect(renderTemplate("https://x.com/{id}", {})).toMatchObject({ ok: false });
  });

  it("fails on disallowed schemes", () => {
    expect(renderTemplate("javascript:{x}", { x: "alert(1)" })).toMatchObject({ ok: false });
    expect(renderTemplate("ftp://x.com/{id}", { id: "1" })).toMatchObject({ ok: false });
  });

  it("fails on templates that are not URLs", () => {
    expect(renderTemplate("not a url {id}", { id: "1" })).toMatchObject({ ok: false });
  });
});
