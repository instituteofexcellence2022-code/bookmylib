
import React from 'react'
import { getAdminProfile, getMyAuditLogs } from '@/actions/admin/profile'
import { AdminProfileClient } from '@/components/admin/profile/AdminProfileClient'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'My Profile | Platform Admin',
    description: 'Manage your admin account settings'
}

export default async function AdminProfilePage() {
    const [admin, logs] = await Promise.all([
        getAdminProfile(),
        getMyAuditLogs()
    ])

    if (!admin) {
        redirect('/admin/login')
    }

    return <AdminProfileClient admin={admin} logs={logs} />
}
