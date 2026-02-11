 'use client'
 
 import React, { useEffect, useMemo, useState } from 'react'
 import { FormInput } from '@/components/ui/FormInput'
 import { AnimatedButton } from '@/components/ui/AnimatedButton'
 import { UserPlus, Search, RefreshCw } from 'lucide-react'
 import { toast } from 'sonner'
 import { useRouter } from 'next/navigation'
 import { getPlatformUsers, type PlatformUserSummary, createPlatformUser, updatePlatformUser, togglePlatformUserActive } from '@/actions/admin/platform-users'
 import { UserModal } from './UserModal'
 import { UserList } from './UserList'
 
 export function UsersPageClient({ initialUsers }: { initialUsers: PlatformUserSummary[] }) {
   const router = useRouter()
   const [users, setUsers] = useState<PlatformUserSummary[]>(initialUsers)
   const [loading, setLoading] = useState(false)
   const [search, setSearch] = useState('')
   const [isCreateOpen, setIsCreateOpen] = useState(false)
   const [editUser, setEditUser] = useState<PlatformUserSummary | null>(null)
 
   useEffect(() => {
     setUsers(initialUsers)
   }, [initialUsers])
 
   const filtered = useMemo(() => {
     if (!search) return users
     const s = search.toLowerCase()
     return users.filter(u => 
       u.name.toLowerCase().includes(s) || 
       u.email.toLowerCase().includes(s) || 
       u.role.toLowerCase().includes(s)
     )
   }, [users, search])
 
   const refresh = async () => {
     setLoading(true)
     try {
       const list = await getPlatformUsers()
       setUsers(list)
       router.refresh()
     } catch (e) {
       toast.error('Failed to refresh users')
     } finally {
       setLoading(false)
     }
   }
 
   const handleCreate = async (data: { name: string; email: string; password: string; role: string }) => {
     setLoading(true)
     try {
       const res = await createPlatformUser(data as any)
       if (res.success) {
         toast.success('User created')
         setIsCreateOpen(false)
         await refresh()
       } else {
         toast.error('Failed to create user')
       }
     } finally {
       setLoading(false)
     }
   }
 
   const handleUpdate = async (id: string, data: { name?: string; role?: string; password?: string }) => {
     setLoading(true)
     try {
       const res = await updatePlatformUser(id, data as any)
       if (res.success) {
         toast.success('User updated')
         setEditUser(null)
         await refresh()
       } else {
         toast.error('Failed to update user')
       }
     } finally {
       setLoading(false)
     }
   }
 
   const handleToggleActive = async (id: string, isActive: boolean) => {
     setLoading(true)
     try {
       const res = await togglePlatformUserActive(id, isActive)
       if (res.success) {
         toast.success(isActive ? 'User enabled' : 'User disabled')
         await refresh()
       } else {
         toast.error('Failed to update status')
       }
     } finally {
       setLoading(false)
     }
   }
 
   return (
     <div className="space-y-6">
       <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
         <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Users</h1>
           <p className="text-gray-500 dark:text-gray-400">Manage admin and support accounts.</p>
         </div>
         <div className="flex gap-2">
           <AnimatedButton 
             variant="purple"
             icon="add"
             onClick={() => setIsCreateOpen(true)}
           >
             Add User
           </AnimatedButton>
           <button
             onClick={refresh}
             className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
             title="Refresh"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
         </div>
       </div>
 
       <div className="flex items-center gap-3">
         <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
           <FormInput
             placeholder="Search by name, email, role..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-10"
           />
         </div>
       </div>
 
       <UserList 
         users={filtered}
         loading={loading}
         onEdit={(u) => setEditUser(u)}
         onToggleActive={handleToggleActive}
       />
 
       <UserModal 
         mode="create"
         open={isCreateOpen}
         onOpenChange={setIsCreateOpen}
         onSubmit={handleCreate}
       />
 
       <UserModal
         mode="edit"
         open={!!editUser}
         onOpenChange={(o) => !o && setEditUser(null)}
         user={editUser || undefined}
         onSubmit={(data) => handleUpdate(editUser!.id, data)}
       />
     </div>
   )
 }
