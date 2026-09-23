import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, migrate } from "./schema";

describe("migrate", () => {
  it("returns an empty store for absent data", () => {
    expect(migrate(undefined)).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, commands: [] });
  });
  it("passes a current-version store through and drops unknown keys", () => {
    const s = migrate({ schemaVersion: 1, commands: [{ id: "a" }], preferences: { defaultOpenMode: "current-tab" } });
    expect(s).toEqual({ schemaVersion: 1, commands: [{ id: "a" }] });
  });
  it("tolerates a missing commands array", () => {
    expect(migrate({ schemaVersion: 1 }).commands).toEqual([]);
  });
});
