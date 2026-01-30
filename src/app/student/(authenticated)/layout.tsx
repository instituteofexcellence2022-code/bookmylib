import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import StudentLayoutClient from './StudentLayoutClient'
import { getStudentAnnouncements } from '@/actions/announcement'
import { COOKIE_KEYS } from '@/lib/auth/session'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

  if (!studentId) {
    redirect('/student/login')
  }

  const [student, announcements] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true, image: true }
    }),
    getStudentAnnouncements()
  ])

  if (!student) {
    redirect('/student/logout')
  }

  const user = {
    name: student.name,
    role: 'student',
    initials: student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    image: student.image
  }

  // Serialize announcements to pass to client component
  const serializedAnnouncements = JSON.parse(JSON.stringify(announcements))

  return (
    <StudentLayoutClient user={user} announcements={serializedAnnouncements}>
      {children}
    </StudentLayoutClient>
  )
}
