'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createHash } from 'crypto'
import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { uploadFile } from './upload'

export async function getOwnerProfile() {
  try {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get('owner_session')?.value

    let owner = null

    if (ownerId) {
      owner = await prisma.owner.findUnique({
        where: { id: ownerId },
        include: {
          library: true
        }
      })
    }

    if (!owner && process.env.NODE_ENV !== 'production') {
      owner = await prisma.owner.findFirst({
        include: {
          library: true
        }
      })
    }

    if (owner) return owner

    return null
  } catch (error) {
    // Re-throw Next.js dynamic server usage errors
    if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('Error fetching owner profile:', error)
    return null
  }
}

export async function updateOwnerProfile(formData: FormData) {
  try {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const username = formData.get('username') as string
    const bio = formData.get('bio') as string
    const socialLinks = formData.get('socialLinks') as string // JSON string

    await prisma.owner.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        username,
        bio,
        socialLinks: socialLinks || undefined
      }
    })

    revalidatePath('/owner/profile')
    return { success: true }
  } catch (error) {
    console.error('Error updating owner profile:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}

export async function updateOwnerImage(formData: FormData) {
  try {
    const id = formData.get('id') as string
    const file = formData.get('image') as File
    
    if (!file || file.size === 0) {
        return { success: false, error: 'No image provided' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Invalid file type' }
    }

    const imageUrl = await uploadFile(file)
    
    if (!imageUrl) {
        return { success: false, error: 'Failed to upload image' }
    }

    await prisma.owner.update({
      where: { id },
      data: { image: imageUrl }
    })

    revalidatePath('/owner/profile')
    return { success: true, imageUrl }
  } catch (error) {
    console.error('Error updating owner image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update image' }
  }
}

export async function changeOwnerPassword(formData: FormData) {
  try {
    const id = formData.get('id') as string
    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string

    const owner = await prisma.owner.findUnique({ where: { id } })
    
    if (!owner) {
        return { success: false, error: 'Owner not found' }
    }

    if (owner.password) {
        const isBcrypt = owner.password.startsWith('$2')
        let isCurrentValid = false
        if (isBcrypt) {
            isCurrentValid = await bcrypt.compare(currentPassword, owner.password)
        } else {
            const hashedCurrent = createHash('sha256').update(currentPassword).digest('hex')
            isCurrentValid = hashedCurrent === owner.password
        }
        if (!isCurrentValid) {
            return { success: false, error: 'Incorrect current password' }
        }
    }
    const hashedNew = await bcrypt.hash(newPassword, 10)

    await prisma.owner.update({
        where: { id },
        data: { password: hashedNew }
    })

    return { success: true }
  } catch (error) {
    console.error('Error changing password:', error)
    return { success: false, error: 'Failed to change password' }
  }
}

export async function updateLibraryDetails(formData: FormData) {
    try {
        const id = formData.get('id') as string
        const name = formData.get('name') as string
        const website = formData.get('website') as string
        const contactEmail = formData.get('contactEmail') as string
        const contactPhone = formData.get('contactPhone') as string

    if (contactPhone && (contactPhone.length !== 10 || !/^\d{10}$/.test(contactPhone))) {
      return { success: false, error: 'Please enter a valid 10-digit contact phone number' }
    }

    const address = formData.get('address') as string

        await prisma.library.update({
            where: { id },
            data: {
                name,
                website,
                contactEmail,
                contactPhone,
                address
            }
        })
        
        revalidatePath('/owner/profile')
        return { success: true }
    } catch (error) {
        console.error('Error updating library details:', error)
        return { success: false, error: 'Failed to update library details' }
    }
}

export async function updateLibraryLogo(formData: FormData) {
    try {
        const id = formData.get('id') as string
        const file = formData.get('logo') as File

        if (!file || file.size === 0) {
            return { success: false, error: 'No logo provided' }
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'Invalid file type' }
        }

        const logoUrl = await uploadFile(file)
        
        if (!logoUrl) {
            return { success: false, error: 'Failed to upload logo' }
        }

        await prisma.library.update({
            where: { id },
            data: { logo: logoUrl }
        })

        revalidatePath('/owner/profile')
        return { success: true, logoUrl }
    } catch (error) {
        console.error('Error updating library logo:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update library logo' }
    }
}

export async function updateOwnerPreferences(formData: FormData) {
    try {
        const id = formData.get('id') as string
        const theme = formData.get('theme') as string
        const emailNotifications = formData.get('emailNotifications') === 'true'
        const smsNotifications = formData.get('smsNotifications') === 'true'
        const language = formData.get('language') as string

        const preferences = {
            theme,
            notifications: {
                email: emailNotifications,
                sms: smsNotifications
            },
            language
        }

        await prisma.owner.update({
            where: { id },
            data: { 
                preferences: JSON.stringify(preferences)
            }
        })

        revalidatePath('/owner/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating preferences:', error)
        return { success: false, error: 'Failed to update preferences' }
    }
}

export async function generateTwoFactorSecret(formData: FormData) {
    try {
        const id = formData.get('id') as string
        const secret = generateSecret()
        const owner = await prisma.owner.findUnique({ where: { id } })
        
        if (!owner) {
            return { success: false, error: 'Owner not found' }
        }

        const otpauth = generateURI({
            secret,
            issuer: 'BookMyLib',
            label: owner.email
        })
        const qrCodeUrl = await QRCode.toDataURL(otpauth)
        return { success: true, secret, qrCodeUrl }
    } catch (error) {
        console.error('Error generating 2FA secret:', error)
        return { success: false, error: 'Failed to generate 2FA secret' }
    }
}

export async function enableTwoFactor(formData: FormData) {
    try {
        const id = formData.get('id') as string
        const token = formData.get('token') as string
        const secret = formData.get('secret') as string

        const isValid = verify({ token, secret })
        if (!isValid) {
            return { success: false, error: 'Invalid verification code' }
        }

        await prisma.owner.update({
            where: { id },
            data: {
                twoFactorSecret: secret,
                twoFactorEnabled: true
            }
        })
        
        revalidatePath('/owner/settings')
        return { success: true }
    } catch (error) {
        console.error('Error enabling 2FA:', error)
        return { success: false, error: 'Failed to enable 2FA' }
    }
}

export async function disableTwoFactor(formData: FormData) {
    try {
        const id = formData.get('id') as string
        
        await prisma.owner.update({
            where: { id },
            data: {
                twoFactorSecret: null,
                twoFactorEnabled: false
            }
        })

        revalidatePath('/owner/settings')
        return { success: true }
    } catch (error) {
        console.error('Error disabling 2FA:', error)
        return { success: false, error: 'Failed to disable 2FA' }
    }
}

export async function verifyStudentGovtId(studentId: string, status: 'verified' | 'rejected') {
  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { govtIdStatus: status }
    })
    
    revalidatePath(`/owner/students/${studentId}`)
    revalidatePath('/owner/verification')
    return { success: true }
  } catch (error) {
    console.error('Error verifying govt ID:', error)
    return { success: false, error: 'Verification failed' }
  }
}

export async function getPendingVerifications() {
  try {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get('owner_session')?.value
    if (!ownerId) throw new Error('Unauthorized')

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: { libraryId: true }
    })

    if (!owner) throw new Error('Owner not found')

    const students = await prisma.student.findMany({
      where: {
        libraryId: owner.libraryId,
        govtIdStatus: 'pending',
        govtIdUrl: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        govtIdUrl: true,
        govtIdStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return students
  } catch (error) {
    console.error('Error fetching pending verifications:', error)
    return []
  }
}
