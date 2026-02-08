import { z } from 'zod'

// Library Referral Settings
export const RewardConfigSchema = z.object({
  value: z.number(),
  type: z.enum(['percentage', 'fixed'])
})

export const ReferralConfigSchema = z.object({
  refereeReward: RewardConfigSchema.optional(),
  refereeDiscountValue: z.number().optional(),
  refereeDiscountType: z.string().optional(),
  referrerReward: RewardConfigSchema.optional(),
  referrerDiscountValue: z.number().optional(),
  referrerDiscountType: z.string().optional(),
  enabled: z.boolean().optional()
})

export const ReferralSettingsSchema = z.object({
  all: ReferralConfigSchema.optional(),
  refereeReward: RewardConfigSchema.optional(),
  refereeDiscountValue: z.number().optional(),
  refereeDiscountType: z.string().optional(),
  referrerReward: RewardConfigSchema.optional(),
  referrerDiscountValue: z.number().optional(),
  referrerDiscountType: z.string().optional(),
  enabled: z.boolean().optional()
})

export type ReferralSettings = z.infer<typeof ReferralSettingsSchema>

// Branch Wifi Details
export const WifiCredentialSchema = z.object({
  ssid: z.string(),
  password: z.string()
})

export const WifiDetailsSchema = z.array(WifiCredentialSchema)

export type WifiDetails = z.infer<typeof WifiDetailsSchema>

// Branch Operating Hours
export const OperatingHoursSchema = z.object({
  openingTime: z.string(),
  closingTime: z.string(),
  is247: z.boolean(),
  staffAvailableStart: z.string().optional(),
  staffAvailableEnd: z.string().optional(),
  workingDays: z.array(z.string())
})

export type OperatingHours = z.infer<typeof OperatingHoursSchema>

// Branch Library Rules
export const LibraryRulesSchema = z.array(z.string())

export type LibraryRules = z.infer<typeof LibraryRulesSchema>

// Staff Permissions
// Assumed structure: Resource -> Actions[]
// e.g. { "students": ["create", "read"], "finance": ["read"] }
export const PermissionsSchema = z.record(z.string(), z.array(z.string()))

export type Permissions = z.infer<typeof PermissionsSchema>

// Student Preferences
export const NotificationPreferencesSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
  marketing: z.boolean()
})

export const StudentPreferencesSchema = z.object({
  notifications: NotificationPreferencesSchema
})

export type StudentPreferences = z.infer<typeof StudentPreferencesSchema>
