import React from 'react'
import { getSaasPlans } from '@/actions/admin/platform-plans'
import { PlanList } from '@/components/admin/plans/PlanList'

export default async function AdminPlansPage() {
    const plans = await getSaasPlans()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SaaS Plans</h1>
            </div>
            
            <PlanList plans={plans} />
        </div>
    )
}
