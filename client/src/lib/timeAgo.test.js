import { describe, it, expect } from "vitest";
import { timeAgo } from "./timeAgo";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms) => new Date(Date.now() - ms);

describe("timeAgo", () => {
  it("says 'just now' for anything under a minute", () => {
    expect(timeAgo(ago(5 * 1000))).toBe("just now");
  });

  it("counts in minutes, then hours, then days", () => {
    expect(timeAgo(ago(5 * MINUTE))).toBe("5m ago");
    expect(timeAgo(ago(3 * HOUR))).toBe("3h ago");
    expect(timeAgo(ago(2 * DAY))).toBe("2d ago");
  });

  it("switches to a calendar date once past a week", () => {
    // beyond a week "9d ago" stops being useful, so it shows a real date
    const result = timeAgo(ago(30 * DAY));
    expect(result).not.toMatch(/ago$/);
    expect(result.length).toBeGreaterThan(0);
  });
});
