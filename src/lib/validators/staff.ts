import { z } from 'zod'

export const staffSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  address: z.string().min(1, 'Address is required'),
  role: z.string().min(1, 'Role is required'),
  branchId: z.string().min(1, 'Branch is required'),
  salary: z.string().optional().or(z.literal('')),
  employmentType: z.string().min(1, 'Employment type is required'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().optional().or(z.literal('')),
})

export type StaffFormData = z.infer<typeof staffSchema>
