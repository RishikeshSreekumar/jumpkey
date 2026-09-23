import { describe, expect, it } from "vitest";
import { clipboardArgument, shortValue } from "./clipboard";

describe("clipboardArgument", () => {
  it("accepts identifiers and trims them", () => {
    expect(clipboardArgument("  7f4c2a\n")).toBe("7f4c2a");
    expect(clipboardArgument("34173cdf-655a-4d39-8ef0-e81c7b2beb8e")).toBe("34173cdf-655a-4d39-8ef0-e81c7b2beb8e");
    expect(clipboardArgument("AcmeHQ/app")).toBe("AcmeHQ/app");
    expect(clipboardArgument("ENG-201")).toBe("ENG-201");
  });

  it("rejects empty, whitespace-containing, and oversized text", () => {
    expect(clipboardArgument("")).toBeNull();
    expect(clipboardArgument(null)).toBeNull();
    expect(clipboardArgument("   ")).toBeNull();
    expect(clipboardArgument("payment timeout")).toBeNull();
    expect(clipboardArgument("a\nb")).toBeNull();
    expect(clipboardArgument("x".repeat(201))).toBeNull();
  });

  it("rejects whole URLs", () => {
    expect(clipboardArgument("https://example.com/workflow/1")).toBeNull();
    expect(clipboardArgument("HTTP://x.y")).toBeNull();
  });
});

describe("shortValue", () => {
  it("leaves short values alone and middle-truncates long ones", () => {
    expect(shortValue("7f4c2a")).toBe("7f4c2a");
    const long = "34173cdf-655a-4d39-8ef0-e81c7b2beb8e";
    const s = shortValue(long, 20);
    expect(s).toHaveLength(20);
    expect(s).toContain("…");
    expect(long.startsWith(s.split("…")[0]!)).toBe(true);
    expect(long.endsWith(s.split("…")[1]!)).toBe(true);
  });
});
