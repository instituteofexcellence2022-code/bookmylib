import Razorpay from 'razorpay'

// Use placeholders during build/development if keys are missing
// This prevents build failures when keys are not yet configured
const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'

export const razorpay = new Razorpay({
  key_id,
  key_secret,
})
