import { describe, expect, it } from "vitest";

import { eachDay, lagosDateKey, lagosDayStart, resolveRange } from "@/lib/admin/date-range";

describe("Lagos business days", () => {
  it("treats 23:30 UTC as the next day in Lagos", () => {
    const lateUtc = new Date("2026-10-24T23:30:00.000Z"); // 00:30 WAT on the 25th
    expect(lagosDateKey(lateUtc)).toBe("2026-10-25");
    expect(lagosDayStart(lateUtc).toISOString()).toBe("2026-10-24T23:00:00.000Z");
  });

  it("resolves today and yesterday in Lagos time", () => {
    const now = new Date("2026-10-25T10:00:00.000Z");
    const today = resolveRange({ range: "today" }, now);
    expect(today.from.toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(today.to.toISOString()).toBe("2026-10-25T23:00:00.000Z");

    const yesterday = resolveRange({ range: "yesterday" }, now);
    expect(yesterday.to.toISOString()).toBe(today.from.toISOString());
  });

  it("includes today in rolling ranges", () => {
    const now = new Date("2026-10-25T10:00:00.000Z");
    const week = resolveRange({ range: "7d" }, now);
    expect(eachDay(week)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
  });

  it("starts this month on the 1st", () => {
    const range = resolveRange({ range: "month" }, new Date("2026-10-25T10:00:00.000Z"));
    expect(eachDay(range)[0]).toBe("2026-10-01");
  });

  it("accepts a custom inclusive range and rejects reversed or malformed ones", () => {
    const custom = resolveRange({ range: "custom", from: "2026-10-01", to: "2026-10-03" });
    expect(eachDay(custom)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(resolveRange({ range: "custom", from: "2026-10-05", to: "2026-10-01" }).preset).toBe("30d");
    expect(resolveRange({ range: "custom", from: "nope", to: "2026-10-01" }).preset).toBe("30d");
    expect(resolveRange({ range: "bogus" }).preset).toBe("30d");
  });
});
