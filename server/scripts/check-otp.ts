import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOTPRecords() {
  console.log('🔍 Checking Password Reset OTP records...\n');

  const otps = await prisma.passwordResetOTP.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${otps.length} records:\n`);

  otps.forEach((otp, index) => {
    const now = new Date();
    const isExpired = now > otp.expiresAt;
    const timeLeft = Math.floor((otp.expiresAt.getTime() - now.getTime()) / 1000);

    console.log(`${index + 1}. Email: ${otp.email}`);
    console.log(`   OTP: ${otp.otp}`);
    console.log(`   Used: ${otp.used}`);
    console.log(`   Created: ${otp.createdAt.toLocaleString()}`);
    console.log(`   Expires: ${otp.expiresAt.toLocaleString()}`);
    console.log(`   Status: ${isExpired ? '❌ EXPIRED' : `✅ Valid (${timeLeft}s left)`}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkOTPRecords().catch(console.error);
