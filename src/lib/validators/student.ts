import { z } from 'zod'

export const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  branchId: z.string().min(1, 'Branch is required'),
  dob: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  area: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),
  guardianName: z.string().optional().or(z.literal('')),
  guardianPhone: z.string().regex(/^\d{10}$/, 'Guardian phone number must be exactly 10 digits').optional().or(z.literal('')),
}).refine((data) => data.email || data.phone, {
  message: 'Either Email or Phone is required',
  path: ['email'],
}).refine((data) => data.password || data.dob, {
  message: 'Password or Date of Birth is required',
  path: ['password'],
})

export type StudentFormData = z.infer<typeof studentSchema>
