 'use client'
 
 import React from 'react'
 import { PlatformUserSummary } from '@/actions/admin/platform-users'
 import { CheckCircle2, XCircle, Mail, User, Shield, Power, Edit } from 'lucide-react'
 
 export function UserList({
   users,
   loading,
   onEdit,
   onToggleActive
 }: {
   users: PlatformUserSummary[]
   loading?: boolean
   onEdit: (user: PlatformUserSummary) => void
   onToggleActive: (id: string, isActive: boolean) => void
 }) {
   if (loading) {
     return <div className="p-8 text-center text-gray-500">Processing...</div>
   }
 
   if (users.length === 0) {
     return (
       <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
         <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
         <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No platform users found</h3>
         <p className="text-gray-500 text-sm">Add admins and support accounts using the button above.</p>
       </div>
     )
   }
 
   return (
     <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
       <div className="overflow-x-auto">
         <table className="w-full text-left text-sm">
           <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
             <tr>
               <th className="px-6 py-4 font-medium uppercase text-xs">User</th>
               <th className="px-6 py-4 font-medium uppercase text-xs">Role</th>
               <th className="px-6 py-4 font-medium uppercase text-xs">Status</th>
               <th className="px-6 py-4 font-medium uppercase text-xs">Last Login</th>
               <th className="px-6 py-4 font-medium uppercase text-xs text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
             {users.map(user => (
               <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                 <td className="py-3 px-6">
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                       <User className="w-5 h-5 text-gray-500" />
                     </div>
                     <div>
                       <div className="font-semibold text-gray-900 dark:text-white">{user.name}</div>
                       <div className="text-xs text-gray-500 flex items-center gap-1">
                         <Mail className="w-3.5 h-3.5" />
                         {user.email}
                       </div>
                     </div>
                   </div>
                 </td>
                 <td className="py-3 px-6">
                   <span className="text-sm font-medium capitalize">{user.role.replace('_', ' ')}</span>
                 </td>
                 <td className="py-3 px-6">
                   {user.isActive ? (
                     <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                       <CheckCircle2 className="w-4 h-4" /> Active
                     </span>
                   ) : (
                     <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                       <XCircle className="w-4 h-4" /> Inactive
                     </span>
                   )}
                 </td>
                 <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-400">
                   {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                 </td>
                 <td className="py-3 px-6">
                   <div className="flex justify-end gap-2">
                     <button
                       onClick={() => onEdit(user)}
                       className="px-3 py-1.5 rounded-md text-xs bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-1"
                       title="Edit"
                     >
                       <Edit className="w-3.5 h-3.5" /> Edit
                     </button>
                     <button
                       onClick={() => onToggleActive(user.id, !user.isActive)}
                       className={`px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1 ${
                         user.isActive 
                           ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' 
                           : 'bg-green-600 hover:bg-green-700 text-white'
                       }`}
                       title={user.isActive ? 'Disable' : 'Enable'}
                     >
                       <Power className="w-3.5 h-3.5" /> {user.isActive ? 'Disable' : 'Enable'}
                     </button>
                   </div>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     </div>
   )
 }
