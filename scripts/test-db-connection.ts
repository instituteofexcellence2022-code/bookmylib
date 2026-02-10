import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('Testing DB connection...')
  const start = Date.now()
  try {
    const count = await prisma.owner.count()
    const end = Date.now()
    console.log(`Connection successful. Owner count: ${count}`)
    console.log(`Latency: ${end - start}ms`)
  } catch (error) {
    console.error('Connection failed:', error)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
