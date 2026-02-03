import React, { Suspense } from 'react'
import CreateTicketForm from '@/components/owner/issues/CreateTicketForm'
import { Loader2 } from 'lucide-react'

export default function NewIssuePage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <CreateTicketForm />
      </Suspense>
    </div>
  )
}
