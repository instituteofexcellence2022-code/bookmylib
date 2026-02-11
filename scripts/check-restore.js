const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    const results = await Promise.all([
      prisma.library.count(),
      prisma.owner.count(),
      prisma.branch.count(),
      prisma.staff.count(),
      prisma.student.count(),
      prisma.plan.count(),
      prisma.seat.count(),
      prisma.payment.count(),
      prisma.attendance.count(),
    prisma.supportTicket.count(),
    prisma.platformUser.count(),
    ])
    const output = {
      library: results[0],
      owner: results[1],
      branch: results[2],
      staff: results[3],
      student: results[4],
      plan: results[5],
      seat: results[6],
      payment: results[7],
      attendance: results[8],
    supportTicket: results[9],
    platformUser: results[10],
    }
    console.log(JSON.stringify(output, null, 2))
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
