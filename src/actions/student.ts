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
    const image = formData.get('image') as string

    if (!name || !phone) {
        return { success: false, error: 'Name and phone are required' }
    }

    try {
        await prisma.student.update({
            where: { id: studentId },
            data: { 
                name, 
                phone,
                dob: dob ? new Date(dob) : null,
                gender,
                address,
                area,
                city,
                state,
                pincode,
                guardianName,
                guardianPhone,
                image
            }
        })

        revalidatePath('/student/profile')
        return { success: true }
    } catch (error) {
        console.error('Error updating profile:', error)
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
    const confirmPassword = formData.get('confirmPassword') as string

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { success: false, error: 'All fields are required' }
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: 'New passwords do not match' }
    }

    if (newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student || !student.password) {
            return { success: false, error: 'Student not found' }
        }

        const isValid = await bcrypt.compare(currentPassword, student.password)

        if (!isValid) {
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
        return { success: false, error: 'No file provided' }
    }

    try {
        const url = await uploadFile(file)
        
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
        console.error('Error uploading govt ID:', error)
        return { success: false, error: 'Failed to upload ID' }
    }
}
