import React from 'react'
import { StaffLeadListClient } from '@/components/staff/leads/StaffLeadListClient'

export const metadata = {
    title: 'Lead Management | Staff Portal',
    description: 'Manage enquiries and walk-ins'
}

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage student enquiries and walk-ins</p>
      </div>
      
      <StaffLeadListClient />
    </div>
  )
}
