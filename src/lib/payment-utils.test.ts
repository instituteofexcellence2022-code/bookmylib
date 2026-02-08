import { describe, it, expect } from 'vitest'
import { calculateDiscount } from './payment-utils'

describe('calculateDiscount', () => {
  const baseAmount = 1000
  const baseDescription = 'Monthly Plan'

  it('should return original amount when no discounts provided', () => {
    const result = calculateDiscount(baseAmount, baseDescription, null, null, null)
    expect(result.finalAmount).toBe(1000)
    expect(result.discountAmount).toBe(0)
    expect(result.updatedDescription).toBe('Monthly Plan')
  })

  describe('Coupon Logic', () => {
    it('should apply percentage coupon correctly', () => {
      const coupon = { type: 'percentage', value: 10, maxDiscount: null } // 10% off
      const result = calculateDiscount(baseAmount, baseDescription, coupon, 'SAVE10', null)
      
      expect(result.discountAmount).toBe(100) // 10% of 1000
      expect(result.finalAmount).toBe(900)
      expect(result.updatedDescription).toContain('Coupon: SAVE10')
    })

    it('should respect maxDiscount for percentage coupons', () => {
      const coupon = { type: 'percentage', value: 50, maxDiscount: 200 } // 50% off but max 200
      const result = calculateDiscount(baseAmount, baseDescription, coupon, 'BIGSAVE', null)
      
      expect(result.discountAmount).toBe(200) // Capped at 200
      expect(result.finalAmount).toBe(800)
    })

    it('should apply fixed amount coupon correctly', () => {
      const coupon = { type: 'fixed', value: 150 } // 150 flat off
      const result = calculateDiscount(baseAmount, baseDescription, coupon, 'FLAT150', null)
      
      expect(result.discountAmount).toBe(150)
      expect(result.finalAmount).toBe(850)
    })

    it('should not result in negative amount', () => {
      const coupon = { type: 'fixed', value: 1500 } // More than amount
      const result = calculateDiscount(baseAmount, baseDescription, coupon, 'HUGE', null)
      
      expect(result.finalAmount).toBe(0)
      expect(result.discountAmount).toBe(1500) // Or should it be capped at amount? Logic says discount is value, final is max(0, amount-discount)
    })
  })

  describe('Referral Logic', () => {
    it('should apply referral discount when no coupon is present', () => {
      const referral = { type: 'fixed', value: 100 }
      const result = calculateDiscount(baseAmount, baseDescription, null, null, referral)
      
      expect(result.discountAmount).toBe(100)
      expect(result.finalAmount).toBe(900)
      expect(result.updatedDescription).toContain('Referral Discount')
    })

    it('should prioritize coupon over referral', () => {
      const coupon = { type: 'fixed', value: 200 }
      const referral = { type: 'fixed', value: 100 }
      
      const result = calculateDiscount(baseAmount, baseDescription, coupon, 'PRIORITY', referral)
      
      expect(result.discountAmount).toBe(200) // Coupon applied
      expect(result.finalAmount).toBe(800)
      expect(result.updatedDescription).toContain('Coupon: PRIORITY')
      expect(result.updatedDescription).not.toContain('Referral Discount')
    })

    it('should apply percentage referral discount', () => {
        const referral = { type: 'percentage', value: 20 }
        const result = calculateDiscount(baseAmount, baseDescription, null, null, referral)
        
        expect(result.discountAmount).toBe(200)
        expect(result.finalAmount).toBe(800)
    })
  })
})
