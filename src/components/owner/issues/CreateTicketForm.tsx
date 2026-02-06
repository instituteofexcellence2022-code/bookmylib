'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createOwnerTicket } from '@/actions/ticket'
import { getStudentDetails } from '@/actions/owner/students'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { toast } from 'sonner'
import { AlertTriangle, FileText, Paperclip, Loader2 } from 'lucide-react'

export default function CreateTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')

  const [loading, setLoading] = useState(false)
  const [studentName, setStudentName] = useState<string>('')
  const [fetchingStudent, setFetchingStudent] = useState(false)

  useEffect(() => {
    if (studentId) {
      setFetchingStudent(true)
      getStudentDetails(studentId)
        .then((res) => {
          if (res.success && res.data && res.data.student) {
            setStudentName(res.data.student.name)
          } else {
            toast.error(res.error || 'Student not found')
          }
        })
        .catch(() => toast.error('Failed to fetch student details'))
        .finally(() => setFetchingStudent(false))
    }
  }, [studentId])

  async function handleSubmit(formData: FormData) {
    if (!studentId) {
      toast.error('Student ID is required')
      return
    }
    
    // We need to ensure studentId is in the formData
    formData.append('studentId', studentId)
    
    setLoading(true)
    try {
      const res = await createOwnerTicket(formData)
      if (res.success) {
        toast.success('Ticket created successfully')
        router.push('/owner/issues')
      } else {
        toast.error(res.error || 'Failed to create ticket')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingStudent) {
      return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-2xl font-bold mb-1">Create Support Ticket</h2>
        <p className="text-gray-500">Report an issue for {studentName || 'a student'}</p>
      </div>

      <div className="space-y-4">
        <FormInput
          name="subject"
          label="Subject"
          placeholder="Brief summary of the issue"
          icon={AlertTriangle}
          required
        />

        <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">Description</label>
            <textarea
                name="description"
                rows={5}
                className="w-full bg-background border border-input rounded-lg p-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                placeholder="Detailed description of the issue..."
                required
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
                name="category"
                label="Category"
                icon={FileText}
                options={[
                    { label: 'Payment Issue', value: 'payment' },
                    { label: 'WiFi / Internet', value: 'wifi' },
                    { label: 'Facility / Maintenance', value: 'facility' },
                    { label: 'Account / Login', value: 'account' },
                    { label: 'Other', value: 'other' }
                ]}
                required
            />

            <FormSelect
                name="priority"
                label="Priority"
                icon={AlertTriangle}
                options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' },
                    { label: 'Critical', value: 'critical' }
                ]}
                defaultValue="medium"
            />
        </div>

        <div className="pt-2">
            <label className="block text-sm font-medium mb-2">Attachment (Optional)</label>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center cursor-pointer relative">
                <input 
                    type="file" 
                    name="attachment" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*,.pdf"
                />
                <Paperclip className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">Images or PDF up to 5MB</p>
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <AnimatedButton 
            type="button" 
            variant="ghost" 
            onClick={() => router.back()}
        >
            Cancel
        </AnimatedButton>
        <AnimatedButton 
            type="submit" 
            isLoading={loading}
        >
            Create Ticket
        </AnimatedButton>
      </div>
    </form>
  )
}
