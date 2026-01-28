
import { prisma } from './src/lib/prisma'

async function generateSeats() {
  const branchId = '608907e7-c2ca-4820-854d-516c41357974'
  const libraryId = 'faea8818-faff-42e3-876c-d5d6df33bcfc'
  const seatCount = 80

  try {
    console.log(`Generating ${seatCount} seats for branch ${branchId}...`)
    
    const seats = []
    for (let i = 1; i <= seatCount; i++) {
      seats.push({
        branchId,
        libraryId,
        number: String(i),
        status: 'available',
        type: 'standard',
        section: 'General'
      })
    }

    // Use createMany if supported (SQLite doesn't support createMany in older Prisma versions, but usually does in newer)
    // Or just loop create.
    
    // Let's try loop to be safe or createMany if we are sure.
    // Prisma with SQLite does NOT support createMany. We must use a loop or $transaction.
    
    await prisma.$transaction(
      seats.map(seat => prisma.seat.create({ data: seat }))
    )

    console.log('Seats generated successfully.')
  } catch (error) {
    console.error('Error generating seats:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateSeats()
