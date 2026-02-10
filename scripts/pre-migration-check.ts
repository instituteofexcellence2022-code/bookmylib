import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting backup...')
  
  // Create backups directory if it doesn't exist
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  // Backup Staff
  console.log('Backing up Staff table...')
  const staff = await prisma.staff.findMany()
  fs.writeFileSync(
    path.join(backupDir, `staff-backup-${timestamp}.json`),
    JSON.stringify(staff, null, 2)
  )
  console.log(`Backed up ${staff.length} staff records.`)

  // Check for duplicates
  console.log('\nChecking for duplicate phone numbers in Staff...')
  const phoneCounts = new Map<string, number>()
  const duplicates: string[] = []

  staff.forEach(s => {
    if (s.phone) {
      const count = phoneCounts.get(s.phone) || 0
      phoneCounts.set(s.phone, count + 1)
      if (count === 1) { // It's now 2, so it's a duplicate
        duplicates.push(s.phone)
      }
    }
  })

  if (duplicates.length > 0) {
    console.error('⚠️ Found duplicate phone numbers:', duplicates)
    console.error('Migration will fail unless these are resolved.')
    process.exit(1)
  } else {
    console.log('✅ No duplicate phone numbers found. Safe to migrate.')
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
