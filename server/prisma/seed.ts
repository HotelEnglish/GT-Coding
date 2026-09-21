import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Seed recharge plans
  const plans = [
    {
      id: 'basic',
      name: '基础档',
      price: 5,
      credits: 500,
      characters: 5000,
      qrCodeUrl: process.env.WECHAT_QR_BASIC || 'https://example.com/qr/basic.png',
    },
    {
      id: 'standard',
      name: '标准档',
      price: 10,
      credits: 1200,
      characters: 12000,
      qrCodeUrl: process.env.WECHAT_QR_STANDARD || 'https://example.com/qr/standard.png',
    },
    {
      id: 'premium',
      name: '高级档',
      price: 50,
      credits: 7000,
      characters: 70000,
      qrCodeUrl: process.env.WECHAT_QR_PREMIUM || 'https://example.com/qr/premium.png',
    },
  ];

  for (const plan of plans) {
    await prisma.rechargePlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`Created/Updated plan: ${plan.name}`);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
