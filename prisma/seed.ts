import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);

  const superAdmin = await prisma.platformAdmin.upsert({
    where: { email: 'superadmin@bms.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@bms.com',
      passwordHash: hashedPassword,
      roles: ['super_admin'],
      status: 'active',
      mustResetPassword: false,
    },
  });

  console.log('Super admin created:', superAdmin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
