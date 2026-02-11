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

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
