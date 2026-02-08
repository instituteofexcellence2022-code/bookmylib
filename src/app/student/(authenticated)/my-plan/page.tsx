import React from 'react'
import MyPlanClient from './MyPlanClient'

export default function MyPlanPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Plan</h1>
      <MyPlanClient />
    </div>
  )
}
