import Decimal from 'decimal.js';

/**
 * Parses a value into a safe Decimal.
 * Trims commas, handles null/undefined/empty string.
 * @param {string|number|Decimal} value 
 * @returns {Decimal}
 */
export function toDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  
  if (typeof value === 'string') {
    // Remove commas from formatted strings
    const cleanStr = value.replace(/,/g, '');
    return new Decimal(cleanStr || 0);
  }
  
  // Handle Prisma.Decimal (it has a constructor that works directly with decimal.js usually, but safely we can convert to string)
  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    return new Decimal(value.toString());
  }

  return new Decimal(value);
}

/**
 * Helper methods for basic arithmetic to make it slightly cleaner.
 * They return a standard javascript number rounded to 2 decimal places, 
 * ready to be inserted into Prisma.
 */
export const math = {
  add: (a, b) => Number(toDecimal(a).plus(toDecimal(b)).toFixed(2)),
  sub: (a, b) => Number(toDecimal(a).minus(toDecimal(b)).toFixed(2)),
  mul: (a, b) => Number(toDecimal(a).times(toDecimal(b)).toFixed(2)),
  div: (a, b) => Number(toDecimal(a).dividedBy(toDecimal(b)).toFixed(2)),
  round: (a) => Number(toDecimal(a).toFixed(2)),
  sum: (arr) => Number(arr.reduce((acc, val) => acc.plus(toDecimal(val)), new Decimal(0)).toFixed(2))
};
