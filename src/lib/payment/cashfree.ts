import { Cashfree, CFEnvironment } from 'cashfree-pg'

// Use placeholders to prevent build errors if keys are missing
const appId = process.env.CASHFREE_APP_ID || 'TEST_APP_ID'
const secretKey = process.env.CASHFREE_SECRET_KEY || 'TEST_SECRET_KEY'
const environment = process.env.CASHFREE_ENV === 'PROD' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX

// Initialize Cashfree instance
const cashfree = new Cashfree(
  environment,
  appId,
  secretKey
)

export { cashfree }
