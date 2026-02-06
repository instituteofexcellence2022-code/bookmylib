'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { uploadFile } from './upload'
import { getAuthenticatedStudent } from '@/lib/auth/student'

interface ReferralSettings {
    all?: ReferralConfig;
    refereeReward?: RewardConfig;
    refereeDiscountValue?: number;
    refereeDiscountType?: string;
    referrerReward?: RewardConfig;
    referrerDiscountValue?: number;
    referrerDiscountType?: string;
}

interface ReferralConfig {
    refereeReward?: RewardConfig;
    refereeDiscountValue?: number;
    refereeDiscountType?: string;
    referrerReward?: RewardConfig;
    referrerDiscountValue?: number;
    referrerDiscountType?: string;
}

interface RewardConfig {
    value: number;
    type: string;
}

export async function getStudentProfile() {
    const authStudent = await getAuthenticatedStudent()

    if (!authStudent) {
        // Return error instead of redirecting if possible, or keep redirect if it's a page load requirement
        // But for consistency in "actions", usually we return unauth. 
        // However, this is used in page.tsx, so redirect is fine. 
        // Let's keep redirect for now but wrap the rest.
        redirect('/student/logout')
    }
    const studentId = authStudent.id

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                subscriptions: {
                    include: {
                        plan: true,
                        branch: true,
                        seat: true
                    },
                    where: {
                        status: {
                            in: ['active', 'pending']
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                attendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 5
                }
            }
        })

        if (!student) {
            redirect('/student/logout')
        }

        // Calculate attendance stats
        const totalAttendance = await prisma.attendance.count({
            where: { studentId }
        })
        
        // This month's attendance
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthAttendance = await prisma.attendance.count({
            where: { 
                studentId,
                date: {
                    gte: startOfMonth
                }
            }
        })

        return { 
            success: true,
            data: {
                student,
                stats: {
                    totalAttendance,
                    monthAttendance
                }
            }
        }

    } catch (error) {
        console.error('Error fetching student profile:', error)
        return { success: false, error: 'Failed to fetch profile' }
    }
}

export async function updateStudentProfile(formData: FormData) {
    const student = await getAuthenticatedStudent()

    if (!student) {
        return { success: false, error: 'Unauthorized' }
    }
    const studentId = student.id

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    
    // New fields
    const dob = formData.get('dob') as string
    const gender = formData.get('gender') as string
    const address = formData.get('address') as string
    const area = formData.get('area') as string
    const pincode = formData.get('pincode') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const idProofType = formData.get('idProofType') as string
    
    // File uploads
    const profileImage = formData.get('profileImage') as File
    const idProofFile = formData.get('idProofFile') as File

    try {
        const data: Prisma.StudentUpdateInput = {
            name,
            phone,
            gender: gender || null,
            address: address || null,
            area: area || null,
            pincode: pincode || null,
            city: city || null,
            state: state || null,
            govtIdType: idProofType || null,
        }

        if (dob) {
            data.dob = new Date(dob)
        }

        if (profileImage && profileImage.size > 0) {
            // Fixed: uploadFile only accepts one argument
            const uploadRes = await uploadFile(profileImage)
            if (!uploadRes.success) {
                return { success: false, error: uploadRes.error || 'Failed to upload profile image' }
            }
            data.image = uploadRes.data
        }

        if (idProofFile && idProofFile.size > 0) {
            // Fixed: uploadFile only accepts one argument
            const uploadRes = await uploadFile(idProofFile)
            if (!uploadRes.success) {
                return { success: false, error: uploadRes.error || 'Failed to upload ID proof' }
            }
            data.govtIdUrl = uploadRes.data
        }

        await prisma.student.update({
            where: { id: studentId },
            data
        })

        revalidatePath('/student/profile')
        return { success: true }
    } catch (error) {
        console.error('Error updating profile:', error)
        return { success: false, error: 'Failed to update profile' }
    }
}

export async function updateStudentProfileImage(formData: FormData) {
    const student = await getAuthenticatedStudent()

    if (!student) {
        return { success: false, error: 'Unauthorized' }
    }
    const studentId = student.id

    const imageFile = formData.get('imageFile') as File | null     

    if (!imageFile || imageFile.size === 0) {
        return { success: false, error: 'No image file provided' } 
    }

    try {
        const uploadRes = await uploadFile(imageFile)

        if (!uploadRes.success) {
            return { success: false, error: uploadRes.error || 'Failed to upload image' }
        }

        const uploadedUrl = uploadRes.data

        if (!uploadedUrl) {
            return { success: false, error: 'Failed to upload image' }
        }

        await prisma.student.update({
            where: { id: studentId },
            data: {
                image: uploadedUrl
            }
        })

        revalidatePath('/student/profile')
        return { success: true, imageUrl: uploadedUrl }
    } catch (error) {
        console.error('Error updating profile image:', error)      
        return { success: false, error: 'Failed to update profile image' }
    }
}

export async function uploadGovtId(formData: FormData) {
    const student = await getAuthenticatedStudent()

    if (!student) {
        return { success: false, error: 'Unauthorized' }
    }
    const studentId = student.id

    const file = formData.get('file') as File

    if (!file) {
        return { success: false, error: 'No file uploaded' }       
    }

    try {
        const uploadRes = await uploadFile(file)
        
        if (!uploadRes.success) {
            return { success: false, error: uploadRes.error || 'Upload failed' }
        }

        const url = uploadRes.data

        if (!url) {
            return { success: false, error: 'Upload failed' }
        }

        await prisma.student.update({
            where: { id: studentId },
            data: {
                govtIdUrl: url,
                govtIdStatus: 'pending'
            }
        })

        revalidatePath('/student/profile')
        return { success: true, url }
    } catch (error) {
        console.error('Error uploading Govt ID:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
    }
}

export async function changeStudentPassword(formData: FormData) {  
    const student = await getAuthenticatedStudent()

    if (!student) {
        return { success: false, error: 'Unauthorized' }
    }
    const studentId = student.id

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string      

    if (!newPassword) {
        return { success: false, error: 'New password is required' }
    }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student) {
            return { success: false, error: 'Student not found' }
        }

        // If user has a password, verify it
        if (student.password) {
            if (!currentPassword) {
                return { success: false, error: 'Current password is required' }
            }
            const isValid = await bcrypt.compare(currentPassword, student.password)
            if (!isValid) {
                return { success: false, error: 'Invalid current password' }
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.student.update({
            where: { id: studentId },
            data: {
                password: hashedPassword
            }
        })

        return { success: true }
    } catch (error) {
        console.error('Error changing password:', error)
        return { success: false, error: 'Failed to change password' }
    }
}

export async function updateStudentPreferences(preferences: Record<string, unknown>) { 
    const student = await getAuthenticatedStudent()

    if (!student) {
        return { success: false, error: 'Unauthorized' }
    }
    const studentId = student.id

    try {
        await prisma.student.update({
            where: { id: studentId },
            data: { preferences: preferences as Prisma.InputJsonValue }
        })

        revalidatePath('/student/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating preferences:', error)        
        return { success: false, error: 'Failed to update preferences' }
    }
}

export async function getStudentReferralData() {
    const authStudent = await getAuthenticatedStudent()

    if (!authStudent) {
        redirect('/student/login')
    }
    const studentId = authStudent.id

    try {
        let student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                library: true,
                branch: true,
                referralsMade: {
                    include: {
                        referee: true,
                        rewardCoupon: {
                            select: { code: true }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })

        if (!student) {
            redirect('/student/logout')
        }

        // Generate referral code if not exists
        if (!student.referralCode) {
            const namePrefix = (student.name || 'USER').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase()

            // Retry logic for referral code generation
            let newCode = ''
            let attempts = 0
            const maxAttempts = 3

            while (attempts < maxAttempts) {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000)
                newCode = `${namePrefix}${randomSuffix}`

                // Check if code exists
                const existing = await prisma.student.findUnique({ where: { referralCode: newCode } })
                if (!existing) break

                attempts++
            }

            if (attempts >= maxAttempts) {
                newCode = `${namePrefix}${Date.now().toString().slice(-6)}`
            }

            try {
                student = await prisma.student.update({
                    where: { id: studentId },
                    data: { referralCode: newCode },
                    include: {
                        library: true,
                        branch: true,
                        referralsMade: {
                            include: {
                                referee: true,
                                rewardCoupon: {
                                    select: { code: true }
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }
                    }
                })
            } catch (e) {
                console.error('Referral code generation error', e)     
            }
        }

        const settings = (student.library?.referralSettings as unknown as ReferralSettings) || {}

        // Calculate stats
        const totalReferrals = student.referralsMade.length
        const totalCoupons = student.referralsMade.filter(r => r.rewardCoupon?.code).length
        const coupons = student.referralsMade
            .filter(r => r.rewardCoupon?.code && r.status === 'completed')
            .map(r => ({
                code: r.rewardCoupon?.code || '',
                status: r.status,
                createdAt: r.createdAt
            }))

        return {
            success: true,
            data: {
                referralCode: student.referralCode,
                referrals: student.referralsMade,
                libraryName: student.library?.name,
                branchName: student.branch?.name,
                settings,
                stats: {
                    totalReferrals,
                    totalCoupons,
                    activeCoupons: coupons.length // Assuming completed = active coupon
                }
            }
        }
    } catch (error) {
        console.error('Error fetching referral data:', error)
        return { success: false, error: 'Failed to fetch referral data' }
    }
}

export async function checkPublicStudentByEmail(email: string) {
    try {
        if (!email) return { success: false }
        
        const student = await prisma.student.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { name: true, phone: true, dob: true }
        })

        if (!student) return { success: true, exists: false }

        // Masking
        // Phone: ******1234
        const phone = student.phone || ''
        const maskedPhone = phone.length > 4 
            ? phone.replace(/.(?=.{4})/g, '*') 
            : '******' + phone

        // Mask DOB: ****-**-**
        // We return a string that indicates it's set but hidden
        const maskedDob = '****-**-**'

        return {
            success: true,
            exists: true,
            student: {
                name: student.name,
                phone: maskedPhone,
                dob: maskedDob
            }
        }
    } catch (error) {
        console.error('Error checking student:', error)
        return { success: false, error: 'Failed to check email' }
    }
}
