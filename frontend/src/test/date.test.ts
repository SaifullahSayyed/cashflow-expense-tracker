import { describe, it, expect } from "vitest";
import { formatDate, getMonthName } from "../utils/date";

describe("Date utilities", () => {
  it("formats ISO date string to human readable format", () => {
    expect(formatDate("2026-10-14")).toBe("14 Oct 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("retrieves month name from month number", () => {
    expect(getMonthName(1)).toBe("January");
    expect(getMonthName(10)).toBe("October");
    expect(getMonthName(12)).toBe("December");
  });
});
