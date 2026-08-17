import { prisma } from './src/lib/prisma.js';

async function main() {
  console.log("Deleting all records...");
  
  await prisma.transaction.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.partnership.deleteMany({});
  await prisma.vehicleToken.deleteMany({});
  await prisma.vehicle.deleteMany({});

  console.log("All transactions, vehicles, expenses, and partnerships have been wiped successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
