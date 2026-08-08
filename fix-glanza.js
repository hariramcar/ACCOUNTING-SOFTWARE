const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGlanza() {
  try {
    // 1. Find Raj's account
    const agentAccount = await prisma.account.findFirst({
      where: { name: { contains: 'raj', mode: 'insensitive' } }
    });

    if (!agentAccount) {
      console.log('Could not find Raj account');
      return;
    }

    // 2. Find Toyota Glanza
    const car = await prisma.vehicle.findFirst({
      where: { registration: 'gj05de1246' }
    });

    if (!car) {
      console.log('Could not find Toyota Glanza');
      return;
    }

    // 3. Update the car
    await prisma.vehicle.update({
      where: { id: car.id },
      data: {
        salePendingBalance: 700000,
        receivableAccountId: agentAccount.id
      }
    });

    console.log('Successfully fixed Toyota Glanza! It now has 7,00,000 pending with Raj.');
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGlanza();
