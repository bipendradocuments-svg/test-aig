/**
 * Currency utilities for Indian Rupee (INR) stored as integer paise.
 * 1 Rupee = 100 Paise.
 */

const wholeFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Parses a user-entered rupee value (e.g. "500" or "149.50") into integer paise.
 * Returns null if empty, zero, negative, NaN, or > 2 decimal places.
 */
export function parseRupeesToPaise(raw: string | number): number | null {
  const cleaned = String(raw).trim().replace(/,/g, '');
  if (!cleaned) return null;

  // Allow positive numbers with optional up to 2 decimal places
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) {
    return null;
  }

  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const paise = Math.round(numeric * 100);
  return paise > 0 ? paise : null;
}

/**
 * Converts integer paise into a clean string for populating an amount input.
 */
export function paiseToInputString(amountPaise: number): string {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return '';
  if (amountPaise % 100 === 0) {
    return String(amountPaise / 100);
  }
  return (amountPaise / 100).toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Formats integer paise as Indian Rupees with the en-IN numbering system.
 * Examples:
 *   50000    -> ₹500
 *   500000   -> ₹5,000
 *   2485000  -> ₹24,850
 *   12500000 -> ₹1,25,000
 *   12550    -> ₹125.50
 */
export function formatINR(amountPaise: number): string {
  const safePaise = Number.isFinite(amountPaise) ? Math.round(amountPaise) : 0;
  const sign = safePaise < 0 ? '-' : '';
  const absPaise = Math.abs(safePaise);
  const rupees = absPaise / 100;

  if (absPaise % 100 === 0) {
    return `${sign}₹${wholeFormatter.format(rupees)}`;
  }
  return `${sign}₹${decimalFormatter.format(rupees)}`;
}
