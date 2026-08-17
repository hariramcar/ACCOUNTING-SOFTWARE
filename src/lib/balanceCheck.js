export async function checkSufficientBalance(tx, accountId, requiredAmount, excludeTransactionId = null) {
  // 1. Fetch the account
  const account = await tx.account.findUnique({ where: { id: accountId } });
  
  // 2. We only strictly enforce this for physical money accounts
  if (!account || (account.type !== 'CASH' && account.type !== 'BANK')) {
    return true;
  }

  // 3. Build the query to calculate the current balance
  const whereClause = { accountId: accountId };
  if (excludeTransactionId) {
    whereClause.id = { not: excludeTransactionId };
  }

  const aggregates = await tx.transaction.groupBy({
    by: ['type'],
    where: whereClause,
    _sum: { amount: true }
  });

  let totalCredit = 0;
  let totalDebit = 0;
  
  aggregates.forEach(agg => {
    if (agg.type === 'CREDIT') totalCredit = Number(agg._sum.amount ? agg._sum.amount.toString() : 0);
    if (agg.type === 'DEBIT') totalDebit = Number(agg._sum.amount ? agg._sum.amount.toString() : 0);
  });

  const openingBalance = account.openingBalance ? Number(account.openingBalance.toString()) : 0;
  const currentBalance = openingBalance + totalCredit - totalDebit;
  const amountToDeduct = Number(requiredAmount || 0);

  // 4. Validate if there's enough money
  if (currentBalance < amountToDeduct) {
    throw new Error(`Insufficient funds in ${account.name}. Available Balance: ₹${currentBalance.toLocaleString('en-IN')}`);
  }

  return true;
}
