import React from 'react'
import { getStudentProfile } from '@/actions/student'
import SettingsClient from './SettingsClient'

export default async function StudentSettingsPage() {
  const { student } = await getStudentProfile()

  return (
    <SettingsClient student={student} />
  )
}