const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.platformUser.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@platform.com',
      password: hashedPassword,
      role: 'super_admin'
    }
  })
  
  console.log('Admin user seeded')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })