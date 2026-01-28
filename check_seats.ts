
import { prisma } from './src/lib/prisma'

async function checkSeats() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: { seats: true }
        },
        seats: {
            take: 5
        }
      }
    })
    
    console.log(JSON.stringify(branches, null, 2))
  } catch (error) {
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSeats()
