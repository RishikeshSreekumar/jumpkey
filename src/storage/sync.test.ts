import { describe, expect, it } from "vitest";
import type { Command } from "../core";
import { fromSyncItems, mergeCommands, syncDiff, toSyncItems } from "./sync";

const cmd = (id: string, keyword: string, updatedAt = 0, createdAt = 0): Command => ({
  id,
  keyword,
  name: keyword,
  template: `https://x.com/${keyword}/{id}`,
  openMode: "foreground-tab",
  enabled: true,
  createdAt,
  updatedAt,
});

describe("sync items", () => {
  it("round-trips commands in order", () => {
    const list = [cmd("b", "beta"), cmd("a", "alpha")];
    expect(fromSyncItems(toSyncItems(list))).toEqual(list);
  });

  it("keeps items another device added outside the order, and drops ids without an item", () => {
    const items = { ...toSyncItems([cmd("a", "alpha")]), "c:z": cmd("z", "zed", 0, 5), order: ["a", "gone"] };
    expect(fromSyncItems(items).map((c) => c.id)).toEqual(["a", "z"]);
  });

  it("diffs to only the changed items and the stale ones", () => {
    const before = toSyncItems([cmd("a", "alpha"), cmd("b", "beta")]);
    const after = toSyncItems([cmd("a", "alpha", 2), cmd("c", "gamma")]);
    const { set, remove } = syncDiff(before, after);
    expect(Object.keys(set).sort()).toEqual(["c:a", "c:c", "order"]);
    expect(remove).toEqual(["c:b"]);
  });

  it("writes nothing when nothing changed", () => {
    const items = toSyncItems([cmd("a", "alpha")]);
    expect(syncDiff(items, toSyncItems([cmd("a", "alpha")]))).toEqual({ set: {}, remove: [] });
  });
});

describe("mergeCommands", () => {
  it("unions by id and keeps the newer edit", () => {
    const merged = mergeCommands([cmd("a", "alpha", 1), cmd("b", "beta")], [cmd("a", "alpha2", 5), cmd("c", "gamma")]);
    expect(merged.map((c) => c.keyword)).toEqual(["alpha2", "beta", "gamma"]);
  });

  it("keeps the newer of two commands sharing a keyword", () => {
    const merged = mergeCommands([cmd("a", "jira", 1)], [cmd("b", "jira", 3)]);
    expect(merged.map((c) => c.id)).toEqual(["b"]);
  });
});
