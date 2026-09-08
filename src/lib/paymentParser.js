/**
 * Utility functions for safely parsing and formatting expense payment modes.
 * Supports simple mode strings ('CASH', 'BANK', 'UGHRANI') and split payment JSON objects.
 */

/**
 * Safely parses requestedMode string without ever throwing runtime errors.
 * @param {string | null | undefined} rawMode 
 * @returns {{
 *   isSplit: boolean,
 *   payments: Array<{ mode: string, amount: number, accountId?: string, customLabel?: string }>,
 *   pendingBalance: number,
 *   rawMode: string | null,
 *   singleMode: string | null,
 *   displayMode: string
 * }}
 */
export function parseRequestedMode(rawMode) {
  const defaultResult = {
    isSplit: false,
    payments: [],
    pendingBalance: 0,
    rawMode: rawMode || null,
    singleMode: null,
    displayMode: 'PENDING'
  };

  if (!rawMode || typeof rawMode !== 'string') {
    return defaultResult;
  }

  const trimmed = rawMode.trim();
  if (!trimmed) {
    return defaultResult;
  }

  // Handle JSON encoded payments (Split payment or advanced payment structure)
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const payments = Array.isArray(parsed?.payments)
        ? parsed.payments.map(p => ({
            mode: p.mode || 'CASH',
            amount: Number(p.amount || 0),
            accountId: p.accountId || null,
            customLabel: p.customLabel || null
          }))
        : [];

      const pendingBalance = Number(parsed?.pendingBalance || 0);
      const isSplit = payments.length > 0;

      return {
        isSplit,
        payments,
        pendingBalance,
        rawMode: trimmed,
        singleMode: null,
        displayMode: isSplit ? (payments.length > 1 ? 'SPLIT' : payments[0].mode) : 'PENDING'
      };
    } catch (err) {
      console.warn('paymentParser: Corrupted JSON requestedMode encountered:', trimmed, err.message);
      return {
        ...defaultResult,
        rawMode: trimmed,
        singleMode: trimmed,
        displayMode: trimmed
      };
    }
  }

  // Handle standard scalar modes
  return {
    isSplit: false,
    payments: [],
    pendingBalance: 0,
    rawMode: trimmed,
    singleMode: trimmed,
    displayMode: trimmed
  };
}

/**
 * Serializes payment splits and pending balance into a standard JSON string.
 * @param {Array<{ mode: string, amount: number, accountId?: string }>} payments 
 * @param {number} pendingBalance 
 * @returns {string}
 */
export function formatRequestedMode(payments = [], pendingBalance = 0) {
  return JSON.stringify({
    payments: payments.map(p => ({
      mode: p.mode,
      amount: Number(p.amount || 0),
      accountId: p.accountId || null
    })),
    pendingBalance: Number(pendingBalance || 0)
  });
}
