
import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Checking owners...')
  const owners = await prisma.owner.findMany()
  console.log(`Found ${owners.length} owners.`)
  
  for (const owner of owners) {
    console.log(`Owner: ${owner.email}`)
    // We can't know the password, but we can check if it has a hash
    console.log(`Has password: ${!!owner.password}`)
    console.log(`Hash length: ${owner.password?.length}`)
    console.log(`2FA Enabled: ${owner.twoFactorEnabled}`)
    console.log(`2FA Secret: ${!!owner.twoFactorSecret}`)
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
