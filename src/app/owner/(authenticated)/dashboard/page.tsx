import React, { Suspense } from 'react'
import { getDashboardStats } from '@/actions/owner/dashboard'
import { getOwnerBranches } from '@/actions/branch'
import DashboardClient from './DashboardClient'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Dashboard | Library Management',
  description: 'Overview of your library performance',
}

export default async function DashboardPage() {
  const [statsResult, branchesResult] = await Promise.all([
    getDashboardStats(),
    getOwnerBranches()
  ])

  const initialData = (statsResult.success && statsResult.data) ? statsResult.data : null
  const branches = branchesResult.success ? branchesResult.data : []

  // Transform branches to match the expected interface {id: string, name: string}
  const formattedBranches = branches?.map(b => ({
    id: b.id,
    name: b.name
  })) || []

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardClient 
        initialData={initialData} 
        initialBranches={formattedBranches}
      />
    </Suspense>
  )
}
