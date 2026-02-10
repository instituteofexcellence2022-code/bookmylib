import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Order is CRITICAL for foreign key constraints
const models = [
  'library',
  'owner',
  'branch',
  'staff',
  'staffActivity',
  'student',
  'plan',
  'seat',
  'locker',
  'studentSubscription',
  'attendance',
  'staffAttendance',
  'staffShift',
  'payment',
  'additionalFee',
  'studentWallet',
  'walletTransaction',
  'promotion',
  'supportTicket',
  'ticketComment',
  'announcement',
  'studentGoal',
  'focusSession',
  'studentNote',
  'referral',
  'lead',
  'leadInteraction'
]

async function main() {
  const backupDir = path.join(process.cwd(), 'backups')
  
  // Find latest full backup
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('full-backup-'))
    .sort()
    .reverse()

  if (files.length === 0) {
    console.error('No full backups found.')
    process.exit(1)
  }

  const latestBackup = files[0]
  console.log(`Restoring from ${latestBackup}...`)
  
  const allData = JSON.parse(fs.readFileSync(path.join(backupDir, latestBackup), 'utf-8'))
  
  for (const modelName of models) {
    const records = allData[modelName]
    if (!records || records.length === 0) {
      console.log(`Skipping ${modelName} (no records)`)
      continue
    }

    console.log(`Restoring ${modelName} (${records.length} records)...`)
    
    let successCount = 0
    let errorCount = 0

    for (const record of records) {
      try {
        // Handle specific field transformations if needed (e.g., Dates are strings in JSON)
        // Prisma Client handles string-to-Date conversion automatically for simple fields usually,
        // but let's be safe if we encounter issues. 
        // Ideally, we pass the record as-is and let Prisma handle type coercion where possible,
        // or we manually fix dates.
        
        // Fix Date fields: Scan keys and if value looks like date string, convert to Date object
        // This is a naive but often effective way for a generic script
        for (const key in record) {
          if (typeof record[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(record[key])) {
            record[key] = new Date(record[key])
          }
        }

        // @ts-ignore
        await prisma[modelName].upsert({
          where: { id: record.id },
          update: record,
          create: record,
        })
        successCount++
      } catch (e: any) {
        console.error(`Failed to restore ${modelName} ${record.id}:`, e.message)
        errorCount++
      }
    }
    console.log(`  -> ${successCount} success, ${errorCount} failed`)
  }
  
  console.log('\nRestore completed.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
