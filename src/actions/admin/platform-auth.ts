'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession, deleteSession } from '@/lib/auth/session'
import { loginLimiterAsync } from '@/lib/rate-limit'
import { redirect } from 'next/navigation'

export async function loginAdmin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }
  if (!(await loginLimiterAsync(email.toLowerCase(), 'admin'))) {
    return { success: false, error: 'Too many attempts. Please try again later.' }
  }

  try {
    const admin = await prisma.platformUser.findUnique({
      where: { email }
    })

    if (!admin || !admin.isActive) {
      return { success: false, error: 'Invalid credentials or account inactive' }
    }

    const isValid = await bcrypt.compare(password, admin.password)

    if (!isValid) {
      return { success: false, error: 'Invalid credentials' }
    }

    await createSession(admin.id, 'admin')
    
    // Log login (audit log)
    try {
        await prisma.platformAuditLog.create({
            data: {
                platformUserId: admin.id,
                action: 'LOGIN',
                details: 'Admin logged in via login page',
            }
        })
    } catch (e) {
        console.error('Failed to create audit log:', e)
        // Don't block login if audit log fails
    }

    return { success: true }
  } catch (error) {
    console.error('Admin login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

export async function logoutAdmin() {
  await deleteSession('admin')
  redirect('/admin/login')
}
