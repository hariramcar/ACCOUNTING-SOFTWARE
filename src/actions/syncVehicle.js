import prisma from '@/lib/prisma';

export async function syncVehicleState(tx, vehicleId) {
  // 1. Fetch vehicle with expenses and partnerships
  const vehicle = await tx.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      expenses: { where: { status: 'APPROVED' } },
      partnerships: true
    }
  });

  if (!vehicle) return;

  // 2. Fetch all transactions linked to this vehicle natively
  let txs = await tx.transaction.findMany({
    where: { referenceId: vehicleId }
  });

  // Also fetch orphan Profit Share transactions that missed referenceId
  const orphanTxs = await tx.transaction.findMany({
    where: {
      referenceId: null,
      description: {
        contains: `for ${vehicle.make} ${vehicle.model}`
      }
    }
  });

  for (const orphan of orphanTxs) {
    if (orphan.description.startsWith('Auto-Entry: Profit Share') || orphan.description.startsWith('Auto-Entry: Loss Share')) {
      // Fix the orphan transaction by adding referenceId for the future
      await tx.transaction.update({
        where: { id: orphan.id },
        data: { referenceId: vehicleId }
      });
      txs.push(orphan);
    }
  }

  // 3. Recalculate Balances from scratch
  let purchasePrice = 0;
  let purchasePendingBalance = 0;
  let salePrice = 0;
  let salePendingBalance = 0;

  for (const t of txs) {
    if (t.category === 'VEHICLE_PURCHASE') {
      if (t.transactionMode === 'PENDING' && t.type === 'CREDIT') {
        purchasePrice += Number(t.amount);
        purchasePendingBalance += Number(t.amount);
      } else if (t.type === 'CREDIT' && t.description.includes('Pending Udhari')) {
        purchasePrice += Number(t.amount);
        purchasePendingBalance += Number(t.amount);
      } else if (t.type === 'DEBIT' && (t.description.includes('Paid Pending Udhari') || t.description.includes('from Partner Capital'))) {
        purchasePendingBalance -= Number(t.amount);
      } else if (t.type === 'DEBIT') {
        purchasePrice += Number(t.amount);
      }
    } else if (t.category === 'VEHICLE_SALE') {
      if (t.transactionMode === 'PENDING') {
        if (t.type === 'DEBIT') {
          salePrice += Number(t.amount);
          salePendingBalance += Number(t.amount);
        } else if (t.type === 'CREDIT') {
          salePrice -= Number(t.amount);
          salePendingBalance -= Number(t.amount);
        }
      } else if (t.type === 'CREDIT' && t.description.includes('Received Pending Payment')) {
        salePendingBalance -= Number(t.amount);
      } else if (t.type === 'CREDIT' && t.description.includes('Advance Received')) {
        salePrice += Number(t.amount);
      } else if (t.type === 'CREDIT') {
        salePrice += Number(t.amount);
      } else if (t.type === 'DEBIT' && t.description.includes('Pending Receivable')) {
        salePrice += Number(t.amount);
        salePendingBalance += Number(t.amount);
      } else if (t.type === 'DEBIT' && t.description.includes('Refund')) {
        salePrice -= Number(t.amount);
      }
    }
  }

  // 4. Calculate Profit
  const totalExpenses = vehicle.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const legacyExp = Number(vehicle.legacyExpenses || 0);
  const totalCost = purchasePrice + totalExpenses + legacyExp;
  
  let profit = null;
  if (vehicle.status === 'SOLD' && salePrice > 0) {
    profit = salePrice - totalCost;
  } else if (vehicle.status === 'SOLD' && Number(vehicle.salePrice) > 0) {
    profit = Number(vehicle.salePrice) - totalCost;
  } else if (vehicle.status === 'SOLD') {
    profit = 0 - totalCost;
  }

  // 5. Update Partner Profit Shares dynamically!
  if (profit !== null && vehicle.partnerships && vehicle.partnerships.length > 0) {
    for (const partnership of vehicle.partnerships) {
      const profitShare = Math.round((profit * (Number(partnership.profitSharePercentage) / 100)) * 100) / 100;

      // Find the specific Profit Share transaction for this partner
      const shareTx = txs.find(t => 
        (t.description.startsWith('Auto-Entry: Profit Share') || t.description.startsWith('Auto-Entry: Loss Share')) && 
        t.accountId === partnership.partnerAccountId
      );

      if (shareTx) {
        if (profitShare > 0) {
          await tx.transaction.update({
            where: { id: shareTx.id },
            data: {
              type: 'CREDIT',
              amount: profitShare,
              description: `Auto-Entry: Profit Share (${partnership.profitSharePercentage}%) for ${vehicle.make} ${vehicle.model}`
            }
          });
        } else if (profitShare < 0) {
          await tx.transaction.update({
            where: { id: shareTx.id },
            data: {
              type: 'DEBIT',
              amount: Math.abs(profitShare),
              description: `Auto-Entry: Loss Share (${partnership.profitSharePercentage}%) for ${vehicle.make} ${vehicle.model}`
            }
          });
        } else {
          // If profit is 0, just zero it out
          await tx.transaction.update({
            where: { id: shareTx.id },
            data: {
              amount: 0,
              type: 'CREDIT',
              description: `Auto-Entry: Profit Share (${partnership.profitSharePercentage}%) for ${vehicle.make} ${vehicle.model}`
            }
          });
        }
      } else {
        // If it doesn't exist but should, create it
        if (profitShare !== 0) {
           await tx.transaction.create({
              data: {
                date: vehicle.saleDate || new Date(),
                transactionMode: 'CASH',
                type: profitShare > 0 ? 'CREDIT' : 'DEBIT',
                amount: Math.abs(profitShare),
                accountId: partnership.partnerAccountId,
                category: 'GENERAL',
                referenceId: vehicleId,
                description: `Auto-Entry: ${profitShare > 0 ? 'Profit' : 'Loss'} Share (${partnership.profitSharePercentage}%) for ${vehicle.make} ${vehicle.model}`
              }
           });
        }
      }
    }
  }

  // 6. Save the perfectly synchronized state
  await tx.vehicle.update({
    where: { id: vehicleId },
    data: {
      purchasePrice: purchasePrice > 0 ? purchasePrice : vehicle.purchasePrice,
      purchasePendingBalance: purchasePendingBalance >= 0 ? purchasePendingBalance : 0,
      salePrice: salePrice > 0 ? salePrice : (vehicle.status === 'SOLD' ? 0 : null),
      salePendingBalance: salePendingBalance >= 0 ? salePendingBalance : 0,
      profit: profit
    }
  });
}
