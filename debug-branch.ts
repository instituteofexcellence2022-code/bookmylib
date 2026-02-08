
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const branches = await prisma.branch.findMany({
    take: 1,
    orderBy: { updatedAt: 'desc' }
  })

  if (branches.length === 0) {
    console.log('No branches found')
    return
  }

  const branch = branches[0]
  console.log('Branch ID:', branch.id)
  console.log('Name:', branch.name)
  console.log('Description:', branch.description)
  console.log('Library Rules:', branch.libraryRules)
  console.log('Amenities:', branch.amenities)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
