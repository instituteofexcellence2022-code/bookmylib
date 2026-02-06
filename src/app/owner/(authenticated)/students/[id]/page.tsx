import React from 'react'
import { notFound } from 'next/navigation'
import { getStudentDetails } from '@/actions/owner/students'
import { StudentDetailClient } from '@/components/owner/students/StudentDetailClient'

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const result = await getStudentDetails(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const { student, stats } = result.data

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <StudentDetailClient student={student} stats={stats} />
    </div>
  )
}
