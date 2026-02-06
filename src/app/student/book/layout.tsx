import React from 'react'
import { prisma } from '@/lib/prisma'
import StudentLayoutClient from '@/app/student/(authenticated)/StudentLayoutClient'
import { getStudentAnnouncements } from '@/actions/announcement'
import { getAuthenticatedStudent } from '@/lib/auth/student'

export default async function StudentBookLayout({ children }: { children: React.ReactNode }) {
  const studentAuth = await getAuthenticatedStudent()

  if (studentAuth) {
    const [student, announcements] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentAuth.id },
        select: { name: true, image: true }
      }),
      getStudentAnnouncements()
    ])

    if (student) {
      const user = {
        name: student.name,
        role: 'student',
        initials: student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        image: student.image
      }
      
      const serializedAnnouncements = JSON.parse(JSON.stringify(announcements))

      return (
        <StudentLayoutClient user={user} announcements={serializedAnnouncements}>
          {children}
        </StudentLayoutClient>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
       {children}
    </div>
  )
}
