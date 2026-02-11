const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

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
        for (const key in record) {
          const v = record[key]
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
            record[key] = new Date(v)
          }
        }

        await prisma[modelName].upsert({
          where: { id: record.id },
          update: record,
          create: record,
        })
        successCount++
      } catch (e) {
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
