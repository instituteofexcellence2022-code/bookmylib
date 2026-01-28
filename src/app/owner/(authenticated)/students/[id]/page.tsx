import React from 'react'
import { notFound } from 'next/navigation'
import { getStudentDetails } from '@/actions/owner/students'
import { StudentDetailClient } from '@/components/owner/students/StudentDetailClient'

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const data = await getStudentDetails(id)

  if (!data) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <StudentDetailClient student={data.student} stats={data.stats} />
    </div>
  )
}
