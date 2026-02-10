import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// List of all models in dependency order (roughly)
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
  console.log('Starting FULL database backup...')
  
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `full-backup-${timestamp}.json`)
  
  const allData: Record<string, any[]> = {}
  
  for (const modelName of models) {
    try {
      // @ts-ignore - dynamic access
      if (prisma[modelName]) {
        console.log(`Backing up ${modelName}...`)
        // @ts-ignore
        const data = await prisma[modelName].findMany()
        allData[modelName] = data
        console.log(`  -> ${data.length} records`)
      } else {
        console.warn(`⚠️ Model ${modelName} not found in Prisma Client`)
      }
    } catch (error) {
      console.error(`❌ Error backing up ${modelName}:`, error)
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(allData, null, 2))
  console.log(`\n✅ Full backup saved to: ${backupPath}`)
  console.log(`Total size: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
