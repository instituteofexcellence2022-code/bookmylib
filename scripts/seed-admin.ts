import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@bookmylib.com'
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123'
  const hashedPassword = await bcrypt.hash(password, 12)

  // 1. Create Super Admin
  const admin = await prisma.platformUser.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Super Admin',
      email,
      password: hashedPassword,
      role: 'super_admin',
    },
  })

  console.log(`✅ Super Admin ready: ${email}`)

  // 2. Create SaaS Plans
  const plans = [
    {
      name: 'Free Trial',
      slug: 'free-trial',
      priceMonthly: 0,
      priceYearly: 0,
      maxBranches: 1,
      maxStudents: 50,
      maxStorage: 100, // 100MB
      maxStaff: 1,
      features: { whatsapp: false, biometric: false, custom_domain: false },
    },
    {
      name: 'Growth',
      slug: 'growth',
      priceMonthly: 2999,
      priceYearly: 29990,
      maxBranches: 2,
      maxStudents: 500,
      maxStorage: 1024, // 1GB
      maxStaff: 5,
      features: { whatsapp: true, biometric: true, custom_domain: false },
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      priceMonthly: 9999,
      priceYearly: 99990,
      maxBranches: 10,
      maxStudents: 10000,
      maxStorage: 10240, // 10GB
      maxStaff: 50,
      features: { whatsapp: true, biometric: true, custom_domain: true },
    },
  ]

  for (const plan of plans) {
    await prisma.saasPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }

  console.log(`✅ SaaS Plans seeded: ${plans.map(p => p.name).join(', ')}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
