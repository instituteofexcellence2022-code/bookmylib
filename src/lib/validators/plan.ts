import { z } from 'zod'

export const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  duration: z.coerce.number().int().min(1, 'Duration must be at least 1'),
  durationUnit: z.enum(['days', 'months', 'years'], {
    message: 'Invalid duration unit',
  }),
  category: z.string().min(1, 'Category is required'),
  billingCycle: z.enum(['one_time', 'monthly', 'yearly'], {
    message: 'Invalid billing cycle',
  }),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  branchId: z.string().optional().or(z.literal('')),
  hoursPerDay: z.coerce.number().optional(),
  shiftStart: z.string().optional().or(z.literal('')),
  shiftEnd: z.string().optional().or(z.literal('')),
  includesSeat: z.coerce.boolean().optional(),
  allowSeatReservation: z.coerce.boolean().optional(),
  includesLocker: z.coerce.boolean().optional(),
}).refine((data) => {
  if (data.category === 'flexible' && (!data.hoursPerDay || data.hoursPerDay <= 0)) {
    return false
  }
  return true
}, {
  message: 'Hours per day is required for flexible plans',
  path: ['hoursPerDay'],
}).refine((data) => {
  if (data.category === 'fixed_shift' && (!data.shiftStart || !data.shiftEnd)) {
    return false
  }
  return true
}, {
  message: 'Shift start and end times are required for fixed shift plans',
  path: ['shiftStart'],
})

export type PlanFormData = z.infer<typeof planSchema>
