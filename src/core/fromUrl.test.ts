import { describe, expect, it } from "vitest";
import { alignTemplate, buildTemplate, looksLikeId, nameFromTitle, splitUrl, suggestName, suggestVariables } from "./fromUrl";

const slots = (url: string) => splitUrl(url)!.filter((t) => t.kind === "slot").map((t) => t.text);
const roundTrip = (url: string) => splitUrl(url)!.map((t) => t.text).join("");

describe("splitUrl", () => {
  it("splits host labels, path segments, query values and hash segments", () => {
    const url = "https://app.example.com:8080/workflow/7f4c2a/asset-editor?tab=all&flag#/section/9";
    expect(slots(url)).toEqual(["app", "example", "com", "workflow", "7f4c2a", "asset-editor", "all", "section", "9"]);
    expect(roundTrip(url)).toBe(url);
  });

  it("keeps query keys and bare flags as separators", () => {
    const tokens = splitUrl("https://x.com/?q=hello&flag&k=v")!;
    const q = tokens.filter((t) => t.kind === "slot" && t.role === "query");
    expect(q).toEqual([
      { kind: "slot", text: "hello", role: "query", key: "q" },
      { kind: "slot", text: "v", role: "query", key: "k" },
    ]);
    expect(tokens.some((t) => t.kind === "sep" && t.text === "&flag&k=")).toBe(true);
  });

  it("skips empty segments (trailing slash, double slash)", () => {
    expect(slots("https://x.com/a//b/")).toEqual(["x", "com", "a", "b"]);
    expect(roundTrip("https://x.com/a//b/")).toBe("https://x.com/a//b/");
  });

  it("returns null without scheme or host", () => {
    expect(splitUrl("x.com/a")).toBeNull();
    expect(splitUrl("https:///a")).toBeNull();
  });

  it("splits templates too, leaving variables as single slots", () => {
    expect(slots("https://{env}.example.com/{id}?x={y}")).toEqual(["{env}", "example", "com", "{id}", "{y}"]);
  });
});

describe("looksLikeId", () => {
  it.each(["42", "7f4c2a", "34173cdf-655a-4d39-8ef0-e81c7b2beb8e", "dQw4w9WgXcQ", "deadbeefcafe"])("accepts %s", (s) => {
    expect(looksLikeId(s)).toBe(true);
  });
  it.each(["workflow", "asset-editor", "settings2", "issues", "MandoHQ", "v2"])("rejects %s", (s) => {
    expect(looksLikeId(s)).toBe(false);
  });
});

describe("suggestName", () => {
  const url = "https://api.github.com/MandoHQ/repos/issues/42?page=3#/Asset-Editors/9";
  const tokens = splitUrl(url)!;
  const at = (text: string) => tokens.findIndex((t) => t.kind === "slot" && t.text === text);

  it("names path segments after the singularized route word before them", () => {
    expect(suggestName(tokens, at("42"))).toBe("issue");
    expect(suggestName(tokens, at("repos"))).toBe("mandohq");
  });

  it("falls back to id when the previous segment is itself an id or absent", () => {
    expect(suggestName(tokens, at("MandoHQ"))).toBe("id");
    const t2 = splitUrl("https://x.com/42/7")!;
    expect(suggestName(t2, t2.findIndex((t) => t.text === "7"))).toBe("id");
  });

  it("names query values after their key and host labels by position", () => {
    expect(suggestName(tokens, at("3"))).toBe("page");
    expect(suggestName(tokens, at("api"))).toBe("sub");
    expect(suggestName(tokens, at("github"))).toBe("domain");
    expect(suggestName(tokens, at("com"))).toBe("tld");
  });

  it("names hash segments like path segments", () => {
    expect(suggestName(tokens, at("9"))).toBe("asset_editor");
    const t2 = splitUrl("https://x.com/#top")!;
    expect(suggestName(t2, t2.findIndex((t) => t.text === "top"))).toBe("hash");
  });

  it("de-duplicates against taken names", () => {
    expect(suggestName(tokens, at("42"), new Set(["issue", "issue2"]))).toBe("issue3");
  });
});

describe("suggestVariables / buildTemplate / alignTemplate", () => {
  const url = "https://joinmando.com/workflow/34173cdf-655a-4d39-8ef0-e81c7b2beb8e/asset-editor?v=12";
  const tokens = splitUrl(url)!;

  it("prefills id-like slots, never host labels", () => {
    const sel = suggestVariables(tokens);
    expect(buildTemplate(tokens, sel)).toBe("https://joinmando.com/workflow/{workflow}/asset-editor?v={v}");
  });

  it("round-trips through alignTemplate", () => {
    const sel = suggestVariables(tokens);
    const back = alignTemplate(tokens, buildTemplate(tokens, sel));
    expect(back).toEqual(sel);
  });

  it("aligns an untouched template to an empty selection", () => {
    expect(alignTemplate(tokens, url)).toEqual(new Map());
  });

  it("refuses templates that no longer match slot-for-slot", () => {
    expect(alignTemplate(tokens, "https://joinmando.com/workflow/{id}")).toBeNull();
    expect(alignTemplate(tokens, "https://joinmando.com/workflow/x{id}/asset-editor?v=12")).toBeNull();
    expect(alignTemplate(tokens, "https://other.com/workflow/{id}/asset-editor?v=12")).toBeNull();
  });
});

describe("nameFromTitle", () => {
  it("takes the first chunk before a separator", () => {
    expect(nameFromTitle("Fix login bug · Issue #42 · MandoHQ/app")).toBe("Fix login bug");
    expect(nameFromTitle("Dashboard - Mando")).toBe("Dashboard");
    expect(nameFromTitle("well-known | site")).toBe("well-known");
    expect(nameFromTitle(undefined)).toBe("");
  });
});
