'use client'

import React, { useState } from 'react'
import { ChevronLeft, Wifi, CreditCard, User, HelpCircle, Upload, Check, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { createTicket } from '@/actions/ticket'
import { toast } from 'react-hot-toast'

const CATEGORIES = [
  {
    id: 'service',
    label: 'Library Service',
    icon: Wifi,
    subcategories: ['Free WiFi', 'Fully AC', 'Cleanliness', 'Furniture', 'RO Water', 'Lighting', 'Washroom', 'Other']
  },
  {
    id: 'payment',
    label: 'Payment',
    icon: CreditCard,
    subcategories: ['Double Deduction', 'Refund Request', 'Invoice Issue', 'Wallet Balance', 'Other']
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: User,
    subcategories: ['Staff Behavior', 'Staff Unavailable', 'Shift Issue', 'Other']
  },
  {
    id: 'other',
    label: 'Other',
    icon: HelpCircle,
    subcategories: ['App Bug', 'Feature Request', 'Lost & Found', 'Other']
  }
]

export default function NewIssuePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [details, setDetails] = useState({ subject: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleCategorySelect = (catId: string) => {
    setCategory(catId)
    setStep(2)
  }

  const handleSubcategorySelect = (sub: string) => {
    setSubcategory(sub)
    setDetails(prev => ({
      ...prev,
      subject: sub === 'Other' ? '' : sub
    }))
    setStep(3)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData()
    formData.append('subject', details.subject)
    formData.append('description', details.description)
    formData.append('category', category) // Using main category ID
    formData.append('priority', 'medium') // Default priority
    
    if (attachment) {
      formData.append('attachment', attachment)
    }
    
    // Optional: Include subcategory in description or separate field if schema supports it
    // For now, we'll append it to description
    formData.set('description', `[${subcategory}] ${details.description}`)

    try {
        const result = await createTicket(formData)
        if (result.success) {
            toast.success('Ticket created successfully')
            setStep(4)
        } else {
            toast.error(result.error || 'Failed to create ticket')
        }
    } catch (error) {
        toast.error('An unexpected error occurred')
    } finally {
        setIsSubmitting(false)
    }
  }

  const selectedCategory = CATEGORIES.find(c => c.id === category)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Link href="/student/issues" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Issue</h1>
      </div>

      {/* Progress Bar */}
      <div className="flex space-x-2">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`} 
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What is this regarding?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="flex items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left group"
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mr-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <cat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedCategory && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select a specific issue</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubcategorySelect(sub)}
                className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors first:rounded-t-xl last:rounded-b-xl flex justify-between items-center"
              >
                <span className="text-gray-900 dark:text-white">{sub}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                className={`w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  subcategory !== 'Other' ? 'opacity-75 bg-gray-50 dark:bg-gray-900 cursor-not-allowed' : ''
                }`}
                placeholder="Brief summary of the issue"
                value={details.subject}
                onChange={(e) => setDetails({ ...details, subject: e.target.value })}
                readOnly={subcategory !== 'Other'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Please describe the issue in detail..."
                value={details.description}
                onChange={(e) => setDetails({ ...details, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attachments (Optional)
              </label>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  attachment 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
              >
                {attachment ? (
                  <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                    <Check className="w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">{attachment.name}</p>
                    <p className="text-xs opacity-70 mt-1">Click to change</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload photo or screenshot</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <AnimatedButton
            type="submit"
            size="lg"
            className="w-full touch-device:min-h-11 touch-device:min-w-11"
            isLoading={isSubmitting}
          >
            Submit Report
          </AnimatedButton>
        </form>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ticket Created!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Your ticket regarding &quot;{subcategory}&quot; has been received (ID: #T-1024). We will look into it shortly.
          </p>
          <div className="flex space-x-3">
            <AnimatedButton
              onClick={() => router.push('/student/issues')}
              variant="secondary"
            >
              Back to Issues
            </AnimatedButton>
            <AnimatedButton
              onClick={() => {
                setStep(1)
                setCategory('')
                setSubcategory('')
                setDetails({ subject: '', description: '' })
              }}
              variant="primary"
            >
              Report Another
            </AnimatedButton>
          </div>
        </div>
      )}
    </div>
  )
}
