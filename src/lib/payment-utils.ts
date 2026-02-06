
export interface CouponConfig {
  type: string // 'percentage' | 'fixed'
  value: number
  maxDiscount?: number | null
}

export interface ReferralConfig {
  value: number
  type: string // 'percentage' | 'fixed'
}

export interface DiscountResult {
  finalAmount: number
  discountAmount: number
  updatedDescription: string | null
}

export function calculateDiscount(
  amount: number,
  description: string | null,
  couponConfig: CouponConfig | null,
  couponCode: string | null,
  referralConfig: ReferralConfig | null
): DiscountResult {
  let finalAmount = amount
  let discountAmount = 0
  let updatedDescription = description

  // 1. Coupon Logic
  if (couponConfig && couponCode) {
    if (couponConfig.type === 'percentage' && couponConfig.value !== null) {
      discountAmount = (amount * couponConfig.value) / 100
      if (couponConfig.maxDiscount && discountAmount > couponConfig.maxDiscount) {
        discountAmount = couponConfig.maxDiscount
      }
    } else if (couponConfig.type === 'fixed' && couponConfig.value !== null) {
      discountAmount = couponConfig.value
    }
    finalAmount = Math.round(Math.max(0, amount - discountAmount))
    updatedDescription = updatedDescription ? `${updatedDescription} (Coupon: ${couponCode})` : `Coupon: ${couponCode}`
  } 
  // 2. Referral Logic (only if no coupon applied)
  else if (referralConfig) {
    if (referralConfig.type === 'percentage') {
      discountAmount = (amount * referralConfig.value) / 100
    } else {
      discountAmount = referralConfig.value
    }
    finalAmount = Math.round(Math.max(0, amount - discountAmount))
    updatedDescription = updatedDescription ? `${updatedDescription} (Referral Discount)` : `Referral Discount Applied`
  }

  return {
    finalAmount,
    discountAmount,
    updatedDescription
  }
}
