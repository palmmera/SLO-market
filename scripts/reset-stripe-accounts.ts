import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetStripeAccounts() {
  console.log('Finding all Stripe accounts...');
  
  const accounts = await prisma.stripeAccount.findMany({
    include: { user: { select: { email: true } } }
  });
  
  console.log(`Found ${accounts.length} Stripe accounts`);
  
  for (const account of accounts) {
    console.log(`Deleting account for ${account.user.email} (${account.stripeAccountId})`);
    await prisma.stripeAccount.delete({ where: { id: account.id } });
  }
  
  console.log('✅ All Stripe accounts deleted. Users can now reconnect with the new configuration.');
  
  await prisma.$disconnect();
}

resetStripeAccounts().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
