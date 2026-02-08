import React from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import StudentLayoutClient from './StudentLayoutClient'
import { getStudentAnnouncements } from '@/actions/announcement'
import { getAuthenticatedStudent } from '@/lib/auth/student'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const studentAuth = await getAuthenticatedStudent()

  if (!studentAuth) {
    redirect('/student/logout')
  }

  const [student, announcements] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentAuth.id },
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
