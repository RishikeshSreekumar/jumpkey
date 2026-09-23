import { describe, expect, it } from "vitest";
import { PRESETS, missingSetup, presetDraft, type Preset } from "./presets";
import { validateDraft } from "./validation";

const byId = (id: string) => PRESETS.find((p) => p.id === id)!;

describe("presets", () => {
  it("all validate once their setup is filled, with unique keywords and ids", () => {
    const drafts = PRESETS.map((p: Preset) => presetDraft(p, Object.fromEntries((p.setup ?? []).map((f) => [f.key, f.kind === "path" && f.segments === 2 ? "acme/web" : "acme"]))));
    for (const d of drafts) expect(validateDraft(d, []).errors, d.keyword).toEqual({});
    expect(new Set(PRESETS.map((p) => p.keyword)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it("reports unfilled setup fields", () => {
    expect(missingSetup(byId("jira"), {}).map((f) => f.key)).toEqual(["site"]);
    expect(missingSetup(byId("jira"), { site: "  " })).toHaveLength(1);
    expect(missingSetup(byId("google"), {})).toEqual([]);
  });

  it("cuts pasted URLs and hosts down to what the field needs", () => {
    expect(presetDraft(byId("jira"), { site: "https://acme.atlassian.net/browse/X-1" }).template).toBe("https://acme.atlassian.net/browse/{ticket}");
    expect(presetDraft(byId("jira"), { site: "acme.atlassian.net" }).template).toBe("https://acme.atlassian.net/browse/{ticket}");
    expect(presetDraft(byId("gh-pr"), { repo: "https://github.com/acme/web/pull/3" }).template).toBe("https://github.com/{repo=acme/web}/pull/{number}");
    expect(presetDraft(byId("linear"), { workspace: "https://linear.app/acme/issue/ENG-1" }).template).toBe("https://linear.app/acme/issue/{issue}");
  });

  it("carries the pattern into the draft", () => {
    expect(presetDraft(byId("stripe-customer")).pattern).toBe("cus_[A-Za-z0-9]+");
  });
});
