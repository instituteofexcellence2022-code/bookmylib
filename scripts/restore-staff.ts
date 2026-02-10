import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const backupDir = path.join(process.cwd(), 'backups')
  
  // Find latest backup
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('staff-backup-'))
    .sort()
    .reverse()

  if (files.length === 0) {
    console.error('No backups found.')
    process.exit(1)
  }

  const latestBackup = files[0]
  console.log(`Restoring from ${latestBackup}...`)
  
  const staffData = JSON.parse(fs.readFileSync(path.join(backupDir, latestBackup), 'utf-8'))
  
  console.log(`Found ${staffData.length} records to restore.`)

  for (const staff of staffData) {
    try {
      await prisma.staff.upsert({
        where: { id: staff.id },
        update: staff,
        create: staff,
      })
      console.log(`Restored staff: ${staff.email}`)
    } catch (e) {
      console.error(`Failed to restore ${staff.email}:`, e)
    }
  }
  
  console.log('Restore completed.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
