export function calculateCashBasisExpense(exp, allAccounts = []) {
  // 1. Exclude Non-Operating / Asset / Transfer
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
  if (inc.rawCategory === 'VEHICLE_SALE') return 0;
  if (inc.rawCategory === 'VEHICLE_PURCHASE') return 0;
  if (inc.rawCategory === 'CAPITAL_INJECTION') return 0;
  if (inc.rawCategory === 'UPAD_REPAYMENT' || inc.rawCategory === 'UPAD_WITHDRAWAL' || inc.rawCategory === 'SALARY') return 0;
  
  if (inc.description === 'Opening Balance' || inc.description === 'Capital Introduced / Opening Balance') return 0;
  if (inc.description?.startsWith('Token Received:') && !inc.isForfeitedToken) return 0;
  if (inc.description?.startsWith('Income: Received from')) return 0;
  
  // Smart exclusions for auto-entries that are equity/capital/ledger shifts and NOT operating income
  if (inc.description?.startsWith('Auto-Entry: Received Pending Capital')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Paid Pending Udhari')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Partnership Capital Investment')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Partnership Investment')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Paid Pending Investment Share')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Profit Share')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Profit Earned')) return 0; // Handled globally via firmCarProfit
  if (inc.description?.startsWith('Auto-Entry: Pending Receivable')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Advance Received')) return 0;
  if (inc.description?.startsWith('Auto-Entry: Agent Car Payment Settled')) return 0;

  if (inc.isTransfer) return 0;

  // Everything else is Operating Income!
  return Number(inc.amount || 0);
}
