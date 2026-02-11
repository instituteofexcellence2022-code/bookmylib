 'use client'
 
 import React, { useEffect, useState } from 'react'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
 import { FormInput } from '@/components/ui/FormInput'
 import { FormSelect } from '@/components/ui/FormSelect'
 import { AnimatedButton } from '@/components/ui/AnimatedButton'
 import { PlatformUserSummary } from '@/actions/admin/platform-users'
 
type CreateProps = {
  mode: 'create'
  onSubmit: (data: { name: string; email: string; password: string; role: string }) => Promise<void>
  user?: never
}

type EditProps = {
  mode: 'edit'
  onSubmit: (data: { name?: string; role?: string; password?: string }) => Promise<void>
  user?: PlatformUserSummary
}

type BaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserModal(props: BaseProps & (CreateProps | EditProps)) {
  const { mode, open, onOpenChange } = props
  const { onSubmit } = props
  const user = props.mode === 'edit' ? props.user : undefined
   const [name, setName] = useState('')
   const [email, setEmail] = useState('')
   const [password, setPassword] = useState('')
   const [role, setRole] = useState('support')
   const [loading, setLoading] = useState(false)
 
   useEffect(() => {
     if (mode === 'edit' && user) {
       setName(user.name)
       setEmail(user.email)
       setRole(user.role)
       setPassword('')
     } else {
       setName('')
       setEmail('')
       setRole('support')
       setPassword('')
     }
   }, [mode, user, open])
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault()
     setLoading(true)
     try {
       if (mode === 'create') {
        await (onSubmit as CreateProps['onSubmit'])({ name, email, password, role })
       } else {
        await (onSubmit as EditProps['onSubmit'])({ name, role, password: password || undefined })
       }
     } finally {
       setLoading(false)
     }
   }
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle>{mode === 'create' ? 'Add Platform User' : 'Edit Platform User'}</DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="space-y-4">
           <FormInput
             id="name"
             label="Full Name"
             value={name}
             onChange={(e) => setName(e.target.value)}
             required
           />
           <FormInput
             id="email"
             type="email"
             label="Email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             required
             disabled={mode === 'edit'}
           />
           <FormSelect
             id="role"
             label="Role"
             value={role}
             onChange={(e) => setRole(e.target.value)}
             options={[
               { label: 'Super Admin', value: 'super_admin' },
               { label: 'Support', value: 'support' },
               { label: 'Sales', value: 'sales' },
               { label: 'Developer', value: 'developer' },
             ]}
             required
           />
           <FormInput
             id="password"
             type="password"
             label={mode === 'create' ? 'Password' : 'New Password'}
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required={mode === 'create'}
             placeholder={mode === 'edit' ? 'Leave blank to keep existing' : undefined}
           />
 
           <DialogFooter>
             <AnimatedButton
               type="button"
               variant="outline"
               onClick={() => onOpenChange(false)}
             >
               Cancel
             </AnimatedButton>
             <AnimatedButton
               type="submit"
               isLoading={loading}
               variant="purple"
             >
               {mode === 'create' ? 'Create User' : 'Save Changes'}
             </AnimatedButton>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   )
 }
