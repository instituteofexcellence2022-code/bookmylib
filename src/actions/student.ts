'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { uploadFile } from './upload'

export async function getStudentProfile() {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) {
        redirect('/student/login')
    }

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
                    status: 'active'
                }
            },
            attendance: {
                orderBy: {
                    date: 'desc'
                },
                take: 5
            }
        }
    }).catch(error => {
        console.error('Error fetching student profile:', error)
        throw new Error('Failed to fetch profile')
    })

    if (!student) {
        // If student not found but cookie exists, redirect to logout to clear stale cookie
        redirect('/student/logout')
    }

    try {
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
            student,
            stats: {
                totalAttendance,
                monthAttendance
            }
        }
    } catch (error) {
        console.error('Error fetching student stats:', error)
        throw new Error('Failed to fetch profile stats')
    }
}

export async function updateStudentProfile(formData: FormData) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) {
        return { success: false, error: 'Unauthorized' }
    }

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    
    // New fields
    const dob = formData.get('dob') as string
    const gender = formData.get('gender') as string
    const address = formData.get('address') as string
    const area = formData.get('area') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string
    const guardianName = formData.get('guardianName') as string
    const guardianPhone = formData.get('guardianPhone') as string
    let image = formData.get('image') as string
    const govtIdUrl = formData.get('govtIdUrl') as string

    try {
        await prisma.student.update({
            where: { id: studentId },
            data: {
                name,
                phone,
                dob: dob ? new Date(dob) : undefined,
                gender,
                address,
                area,
                city,
                state,
                pincode,
                guardianName,
                guardianPhone,
                image: image || undefined,
                govtIdUrl: govtIdUrl || undefined,
                govtIdStatus: govtIdUrl ? 'pending' : undefined
            }
        })

        revalidatePath('/student/profile')
        return { success: true }
    } catch (error) {
        console.error('Error updating student profile:', error)
        return { success: false, error: 'Failed to update profile' }
    }
}

export async function changeStudentPassword(formData: FormData) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) {
        return { success: false, error: 'Unauthorized' }
    }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    
    if (!currentPassword || !newPassword) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student || !student.password) {
             return { success: false, error: 'Student not found' }
        }

        const isMatch = await bcrypt.compare(currentPassword, student.password)
        if (!isMatch) {
            return { success: false, error: 'Incorrect current password' }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.student.update({
            where: { id: studentId },
            data: { password: hashedPassword }
        })

        return { success: true }
    } catch (error) {
        console.error('Error changing password:', error)
        return { success: false, error: 'Failed to change password' }
    }
}

export async function uploadGovtId(formData: FormData) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) {
        return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('file') as File
    
    if (!file) {
        return { success: false, error: 'No file uploaded' }
    }

    try {
        const url = await uploadFile(file)
        
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

export async function getStudentReferralData() {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) {
        redirect('/student/login')
    }

    let student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            library: true,
            sentReferrals: {
                include: {
                    referee: true
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
        // Simple code generation: First 4 letters of name + random 4 digits
        // Ensure name exists and is long enough, fallback to 'STUD'
        const cleanName = (student.name || 'STUD').replace(/[^a-zA-Z]/g, '').toUpperCase()
        const codePrefix = (cleanName.length >= 4 ? cleanName : (cleanName + 'XXXX')).slice(0, 4)
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        const newCode = `${codePrefix}${randomNum}`

        try {
            student = await prisma.student.update({
                where: { id: studentId },
                data: { referralCode: newCode },
                include: {
                    library: true,
                    sentReferrals: {
                        include: {
                            referee: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            })
        } catch (e) {
            // If collision (rare), retry or fail gracefully
            console.error('Referral code generation collision', e)
        }
    }

    const settings = student.library?.referralSettings as any || {}
    
    // Calculate stats
    const totalReferrals = student.sentReferrals.length
    const totalCoupons = student.sentReferrals.filter(r => r.referrerCouponCode).length
    const coupons = student.sentReferrals
        .filter(r => r.referrerCouponCode && r.status === 'completed') // 'completed' means coupon issued but not redeemed? 
        // Wait, status definitions:
        // 'pending': referee joined but not paid
        // 'completed': referee paid, coupon issued
        // 'redeemed': referrer used the coupon
        .map(r => ({
            code: r.referrerCouponCode,
            status: r.status,
            createdAt: r.createdAt
        }))

    return {
        referralCode: student.referralCode,
        referrals: student.sentReferrals,
        libraryName: student.library?.name,
        settings,
        stats: {
            totalReferrals,
            totalCoupons,
            activeCoupons: coupons.length // Assuming completed = active coupon
        }
    }
}