/**
 * Utility functions for currency and paise conversions.
 * Storing amounts in paise (1 unit = 100 paise) prevents float rounding errors.
 */

export function formatPaise(paise: number, symbol: string = "₹"): string {
  if (isNaN(paise) || paise === null || paise === undefined) {
    return `${symbol}0.00`;
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const units = (absPaise / 100).toFixed(2);

  // Format with commas: for INR, standard locale formatting
  const parts = units.split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Format integer part with commas
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== "") {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  const sign = isNegative ? "-" : "";
  return `${sign}${symbol}${integerPart}.${decimalPart}`;
}

export function parseInputToPaise(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  const floatVal = parseFloat(cleaned);
  if (isNaN(floatVal)) return 0;
  return Math.round(floatVal * 100);
}

export function paiseToInputValue(paise: number): string {
  if (!paise) return "";
  return (paise / 100).toFixed(2);
}
