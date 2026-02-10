import React from 'react'
import { getLibraries } from '@/actions/admin/platform-libraries'
import { getSaasPlans } from '@/actions/admin/platform-plans'
import { LibraryList } from '@/components/admin/libraries/LibraryList'

export default async function AdminLibrariesPage() {
    const [libraries, plans] = await Promise.all([
        getLibraries(),
        getSaasPlans()
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
                <p className="text-gray-500 dark:text-gray-400">Monitor and manage all library tenants.</p>
            </div>
            
            <LibraryList initialLibraries={libraries} plans={plans} />
        </div>
    )
}
