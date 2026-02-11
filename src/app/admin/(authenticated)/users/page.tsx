import React from 'react'
import { getPlatformUsers } from '@/actions/admin/platform-users'
import { UsersPageClient } from '@/components/admin/users/UsersPageClient'

export default async function AdminUsersPage() {
    const users = await getPlatformUsers()
    return <UsersPageClient initialUsers={users} />
}
