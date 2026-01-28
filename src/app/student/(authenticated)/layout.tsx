import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import StudentLayoutClient from './StudentLayoutClient'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_session')?.value

  if (!studentId) {
    redirect('/student/login')
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { name: true }
  })

  if (!student) {
    redirect('/student/logout')
  }

  const user = {
    name: student.name,
    role: 'student',
    initials: student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <StudentLayoutClient user={user}>
      {children}
    </StudentLayoutClient>
  )
}
