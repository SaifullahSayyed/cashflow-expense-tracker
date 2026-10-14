import { describe, it, expect } from "vitest";
import { formatPaise, parseInputToPaise, paiseToInputValue } from "../utils/currency";

describe("Currency and Paise formatting", () => {
  it("formats integer paise to currency with INR commas", () => {
    expect(formatPaise(10000, "₹")).toBe("₹100.00");
    expect(formatPaise(125050, "₹")).toBe("₹1,250.50");
    expect(formatPaise(10000000, "₹")).toBe("₹1,00,000.00");
    expect(formatPaise(75, "₹")).toBe("₹0.75");
    expect(formatPaise(0, "₹")).toBe("₹0.00");
  });

  it("handles negative amounts correctly", () => {
    expect(formatPaise(-50000, "₹")).toBe("-₹500.00");
  });

  it("parses user input string to paise accurately", () => {
    expect(parseInputToPaise("150")).toBe(15000);
    expect(parseInputToPaise("150.50")).toBe(15050);
    expect(parseInputToPaise("1,250.50")).toBe(125050);
    expect(parseInputToPaise("₹499.00")).toBe(49900);
    expect(parseInputToPaise("0")).toBe(0);
    expect(parseInputToPaise("")).toBe(0);
  });

  it("converts paise to form input value string", () => {
    expect(paiseToInputValue(125050)).toBe("1250.50");
    expect(paiseToInputValue(10000)).toBe("100.00");
    expect(paiseToInputValue(0)).toBe("");
  });
});
