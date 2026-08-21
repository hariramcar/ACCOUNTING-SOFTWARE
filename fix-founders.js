const { PrismaClient } = require('./src/generated/prisma/index.js');
const prisma = new PrismaClient();

async function main() {
  await prisma.account.updateMany({
    where: { name: { equals: 'Bhaudip', mode: 'insensitive' } },
    data: { profitShare: 90 }
  });
  await prisma.account.updateMany({
    where: { name: { equals: 'Afeel', mode: 'insensitive' } },
    data: { profitShare: 10 }
  });
  console.log('Founders updated');
}
main().catch(console.error).finally(() => prisma.$disconnect());
