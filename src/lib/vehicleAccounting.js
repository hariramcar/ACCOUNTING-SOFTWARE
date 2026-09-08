/**
 * Domain service for vehicle financial calculations and transaction classification.
 * Provides resilient, backward-compatible transaction classification and profit math.
 */

/**
 * Classifies a transaction attached to a vehicle and determines its financial impact.
 * @param {Object} t - Transaction record
 * @returns {{
 *   purchasePriceDelta: number,
 *   purchasePendingDelta: number,
 *   salePriceDelta: number,
 *   salePendingDelta: number
 * }}
 */
export function classifyVehicleTransaction(t) {
  const result = {
    purchasePriceDelta: 0,
    purchasePendingDelta: 0,
    salePriceDelta: 0,
    salePendingDelta: 0
  };

  if (!t) return result;

  const amt = Number(t.amount || 0);
  if (amt === 0) return result;

  const desc = (t.description || '').toLowerCase();
  const mode = t.transactionMode;
  const type = t.type;
  const category = t.category;

  if (category === 'VEHICLE_PURCHASE') {
    if ((mode === 'PENDING' && type === 'CREDIT') || (type === 'CREDIT' && desc.includes('pending udhari'))) {
      result.purchasePriceDelta = amt;
      result.purchasePendingDelta = amt;
    } else if (type === 'DEBIT' && (desc.includes('paid pending udhari') || desc.includes('from partner capital'))) {
      result.purchasePendingDelta = -amt;
    } else if (type === 'DEBIT') {
      result.purchasePriceDelta = amt;
    }
  } else if (category === 'VEHICLE_SALE') {
    if (mode === 'PENDING') {
      if (type === 'DEBIT') {
        result.salePriceDelta = amt;
        result.salePendingDelta = amt;
      } else if (type === 'CREDIT') {
        result.salePriceDelta = -amt;
        result.salePendingDelta = -amt;
      }
    } else if (type === 'CREDIT' && desc.includes('received pending payment')) {
      result.salePendingDelta = -amt;
    } else if (type === 'CREDIT') {
      // Handles both "Advance Received" and generic sale credits
      result.salePriceDelta = amt;
    } else if (type === 'DEBIT' && desc.includes('pending receivable')) {
      result.salePriceDelta = amt;
      result.salePendingDelta = amt;
    } else if (type === 'DEBIT' && desc.includes('refund')) {
      result.salePriceDelta = -amt;
    }
  }

  return result;
}

/**
 * Computes all vehicle balances, cost totals, and partner profit allocations.
 * Pure calculation function with zero side effects.
 * 
 * @param {Object} vehicle - Vehicle with expenses, partnerships, and tokens
 * @param {Array} txs - Associated transactions
 * @returns {Object} Calculated financials
 */
export function calculateVehicleFinancials(vehicle, txs = []) {
  let purchasePrice = 0;
  let purchasePendingBalance = 0;
  let salePrice = 0;
  let salePendingBalance = 0;

  for (const t of txs) {
    const impacts = classifyVehicleTransaction(t);
    purchasePrice += impacts.purchasePriceDelta;
    purchasePendingBalance += impacts.purchasePendingDelta;
    salePrice += impacts.salePriceDelta;
    salePendingBalance += impacts.salePendingDelta;
  }

  // Count APPLIED tokens towards the vehicle's total sale price
  const appliedTokensTotal = (vehicle.tokens || [])
    .filter(t => t.status === 'APPLIED')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  if (salePrice > 0 || vehicle.status === 'SOLD') {
    salePrice += appliedTokensTotal;
  }

  // Legacy vehicles hold their purchase price statically on the vehicle record
  const effectivePurchasePrice = (vehicle.isLegacy || purchasePrice === 0)
    ? Number(vehicle.purchasePrice || 0)
    : purchasePrice;

  const totalExpenses = (vehicle.expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const legacyExp = Number(vehicle.legacyExpenses || 0);
  const totalCost = effectivePurchasePrice + totalExpenses + legacyExp;

  let profit = null;
  const finalSalePrice = salePrice > 0 ? salePrice : Number(vehicle.salePrice || 0);
  if (vehicle.status === 'SOLD' && finalSalePrice > 0) {
    profit = finalSalePrice - totalCost;
  } else if (vehicle.status === 'SOLD') {
    profit = 0 - totalCost;
  }

  // Compute partner profit shares
  const partnerShares = [];
  if (profit !== null && vehicle.partnerships && vehicle.partnerships.length > 0) {
    for (const partnership of vehicle.partnerships) {
      const pct = Number(partnership.profitSharePercentage || 0);
      const profitShare = Math.round((profit * (pct / 100)) * 100) / 100;
      partnerShares.push({
        partnershipId: partnership.id,
        partnerAccountId: partnership.partnerAccountId,
        profitSharePercentage: pct,
        profitShare
      });
    }
  }

  // Defense boundaries
  const boundedPurchasePending = Math.max(0, purchasePendingBalance);
  const boundedSalePending = Math.max(0, salePendingBalance);

  return {
    purchasePrice,
    purchasePendingBalance: boundedPurchasePending,
    salePrice: finalSalePrice > 0 ? finalSalePrice : (vehicle.status === 'SOLD' ? 0 : null),
    salePendingBalance: boundedSalePending,
    effectivePurchasePrice,
    totalExpenses,
    totalCost,
    profit,
    partnerShares
  };
}
