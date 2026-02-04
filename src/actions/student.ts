'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { uploadFile } from './upload'
import { COOKIE_KEYS } from '@/lib/auth/session'

export async function getStudentProfile() {
    const cookieStore = await cookies()
    const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

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
    const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

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
    const pincode = formData.get('pincode') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const idProofType = formData.get('idProofType') as string
    
    // File uploads
    const profileImage = formData.get('profileImage') as File
    const idProofFile = formData.get('idProofFile') as File

    try {
        const data: any = {
            name,
            phone,
            gender: gender || null,
            address: address || null,
            area: area || null,
            pincode: pincode || null,
            city: city || null,
            state: state || null,
            idProofType: idProofType || null,
        }

        if (dob) {
            data.dob = new Date(dob)
        }

        if (profileImage && profileImage.size > 0) {
            const url = await uploadFile(profileImage, 'avatars')
            data.imageUrl = url
        }

        if (idProofFile && idProofFile.size > 0) {
            const url = await uploadFile(idProofFile, 'documents')
            data.idProofUrl = url
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
        const maskedPhone = student.phone.length > 4 
            ? student.phone.replace(/.(?=.{4})/g, '*') 
            : '******' + student.phone

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
