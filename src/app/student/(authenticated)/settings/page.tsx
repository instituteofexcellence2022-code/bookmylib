import React from 'react'
import { getStudentProfile } from '@/actions/student'
import SettingsClient from './SettingsClient'

export default async function StudentSettingsPage() {
  const profileResult = await getStudentProfile()

  if (!profileResult.success || !profileResult.data) {
    throw new Error(profileResult.error || 'Failed to load profile')
  }

  const { student } = profileResult.data

  return (
    <SettingsClient student={student} />
  )
}