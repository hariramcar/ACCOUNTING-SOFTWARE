const NON_OPERATING_INCOME_EXACT = new Set([
  'Opening Balance',
  'Capital Introduced / Opening Balance'
]);

const NON_OPERATING_INCOME_PREFIXES = [
  'Auto-Entry: Received Pending Capital',
  'Auto-Entry: Paid Pending Udhari',
  'Auto-Entry: Partnership Capital Investment',
  'Auto-Entry: Partnership Investment',
  'Auto-Entry: Paid Pending Investment Share',
  'Auto-Entry: Profit Share',
  'Auto-Entry: Profit Earned', // Handled globally via firmCarProfit
  'Auto-Entry: Pending Receivable',
  'Auto-Entry: Advance Received',
  'Auto-Entry: Agent Car Payment Settled',
  'Income: Received from'
];

export function calculateCashBasisExpense(exp, allAccounts = []) {
  if (!exp) return 0;

  // 1. Exclude Non-Operating / Asset / Transfer / Rejected
  if (exp.rawCategory === 'VEHICLE_PURCHASE') return 0;
  if (exp.description?.startsWith('Auto-Entry: Paid Full Settlement')) return 0;
  if (exp.isTransfer || exp.status === 'REJECTED') return 0;

  // 2. EXCLUDE Ledger Settlements (Advances, Bill Payments, Salary). These are balance sheet transfers, not P&L expenses!
  if (exp.rawCategory === 'UPAD_WITHDRAWAL' || exp.rawCategory === 'UPAD_REPAYMENT' || exp.rawCategory === 'SALARY') {
    return 0; // "uchak", "bill pay", "advanced" are ALL excluded!
  }

  // 3. INCLUDE standard Operating Expenses IN FULL, regardless of payment source!
  // If we buy a chair for 7,000 on Ughrani (Raja), it is a 7,000 expense NOW.
  if (exp.rawCategory === 'EXPENSE') {
    return Number(exp.amount || 0);
  }

  return 0;
}

export function calculateCashBasisIncome(inc, allAccounts = []) {
  if (!inc) return 0;

  // 1. Exclude Non-Operating Categories & Transfers
  if (
    inc.rawCategory === 'VEHICLE_SALE' ||
    inc.rawCategory === 'VEHICLE_PURCHASE' ||
    inc.rawCategory === 'CAPITAL_INJECTION' ||
    inc.rawCategory === 'UPAD_REPAYMENT' ||
    inc.rawCategory === 'UPAD_WITHDRAWAL' ||
    inc.rawCategory === 'SALARY' ||
    inc.isTransfer
  ) {
    return 0;
  }

  const desc = (inc.description || '').trim();

  // 2. Exact match exclusions
  if (NON_OPERATING_INCOME_EXACT.has(desc)) return 0;

  // 3. Unforfeited token checks
  if (desc.startsWith('Token Received:') && !inc.isForfeitedToken) return 0;

  // 4. Prefix exclusions for equity/capital/ledger shifts
  for (const prefix of NON_OPERATING_INCOME_PREFIXES) {
    if (desc.startsWith(prefix)) {
      return 0;
    }
  }

  // Everything else is Operating Income!
  return Number(inc.amount || 0);
}

