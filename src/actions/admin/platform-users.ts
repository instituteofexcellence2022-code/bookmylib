 'use server'
 
 import { prisma } from '@/lib/prisma'
 import { requireAdmin } from '@/lib/auth/admin'
 import { revalidatePath } from 'next/cache'
 import bcrypt from 'bcryptjs'
 import { z } from 'zod'
import { Prisma } from '@prisma/client'
 
 export type PlatformUserSummary = {
   id: string
   name: string
   email: string
   role: string
   isActive: boolean
   createdAt: Date
   lastLogin: Date | null
 }
 
 const createUserSchema = z.object({
   name: z.string().min(1),
   email: z.string().email(),
   password: z.string().min(6),
   role: z.enum(['super_admin', 'support', 'sales', 'developer'])
 })
 
 const updateUserSchema = z.object({
   name: z.string().min(1).optional(),
   role: z.enum(['super_admin', 'support', 'sales', 'developer']).optional(),
   password: z.string().min(6).optional()
 })
 
export async function getPlatformUsers(search?: string): Promise<PlatformUserSummary[]> {
   await requireAdmin()
 
  const where: Prisma.PlatformUserWhereInput | undefined = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      { role: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
    ]
  } : undefined
 
   const users = await prisma.platformUser.findMany({
     where,
     select: {
       id: true,
       name: true,
       email: true,
       role: true,
       isActive: true,
       createdAt: true,
       lastLogin: true
     },
     orderBy: { createdAt: 'desc' }
   })
 
   return users
 }
 
 export async function createPlatformUser(data: z.infer<typeof createUserSchema>) {
   const admin = await requireAdmin()
   const validated = createUserSchema.parse(data)
 
   const existing = await prisma.platformUser.findUnique({
     where: { email: validated.email }
   })
   if (existing) {
     return { success: false, error: 'Email already exists' }
   }
 
   const hashed = await bcrypt.hash(validated.password, 10)
 
   const user = await prisma.platformUser.create({
     data: {
       name: validated.name,
       email: validated.email,
       password: hashed,
       role: validated.role,
       isActive: true
     },
     select: {
       id: true
     }
   })
 
   await prisma.platformAuditLog.create({
     data: {
       platformUserId: admin.id,
       action: 'CREATE_USER',
       details: `Created platform user ${validated.email}`
     }
   })
 
   revalidatePath('/admin/users')
   return { success: true, id: user.id }
 }
 
 export async function updatePlatformUser(id: string, data: z.infer<typeof updateUserSchema>) {
   const admin = await requireAdmin()
   const validated = updateUserSchema.parse(data)
 
   const updateData: any = {}
   if (validated.name) updateData.name = validated.name
   if (validated.role) updateData.role = validated.role
   if (validated.password) {
     updateData.password = await bcrypt.hash(validated.password, 10)
   }
 
   await prisma.platformUser.update({
     where: { id },
     data: updateData
   })
 
   await prisma.platformAuditLog.create({
     data: {
       platformUserId: admin.id,
       action: 'UPDATE_USER',
       details: `Updated platform user ${id}`
     }
   })
 
   revalidatePath('/admin/users')
   return { success: true }
 }
 
 export async function togglePlatformUserActive(id: string, isActive: boolean) {
   const admin = await requireAdmin()
 
   await prisma.platformUser.update({
     where: { id },
     data: { isActive }
   })
 
   await prisma.platformAuditLog.create({
     data: {
       platformUserId: admin.id,
       action: isActive ? 'ENABLE_USER' : 'DISABLE_USER',
       details: `Set active=${isActive} for user ${id}`
     }
   })
 
   revalidatePath('/admin/users')
   return { success: true }
 }
 
 export async function deletePlatformUser(id: string) {
   const admin = await requireAdmin()
 
   await prisma.platformUser.delete({
     where: { id }
   })
 
   await prisma.platformAuditLog.create({
     data: {
       platformUserId: admin.id,
       action: 'DELETE_USER',
       details: `Deleted platform user ${id}`
     }
   })
 
   revalidatePath('/admin/users')
   return { success: true }
 }
