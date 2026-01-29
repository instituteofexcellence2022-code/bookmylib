'use client'

import React, { useState, useRef } from 'react'
import { Shield, Upload, FileText } from 'lucide-react'
import { uploadStudentGovtId } from '@/actions/staff/students'
import { toast } from 'react-hot-toast'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { useRouter } from 'next/navigation'

interface GovtIdVerificationProps {
    studentId: string
    govtIdUrl: string | null
    govtIdStatus: string
    hasGovtId?: boolean
}

export default function GovtIdVerification({ studentId, govtIdUrl, govtIdStatus, hasGovtId }: GovtIdVerificationProps) {
    const router = useRouter()
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB')
            return
        }

        const formData = new FormData()
        formData.append('studentId', studentId)
        formData.append('file', file)

        setUploading(true)
        try {
            const result = await uploadStudentGovtId(formData)
            if (result.success) {
                toast.success('Document uploaded successfully')
                router.refresh()
            } else {
                toast.error(result.error || 'Upload failed')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Use hasGovtId if provided, otherwise fallback to checking url (which is likely null now)
    const documentExists = hasGovtId || !!govtIdUrl

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Government ID</h3>
                        <p className="text-sm text-gray-500">Verification Status</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                        govtIdStatus === 'verified' ? 'bg-green-100 text-green-700' :
                        govtIdStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        govtIdStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {documentExists ? govtIdStatus : 'Not Uploaded'}
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-100 dark:border-gray-800 text-center mb-6">
                    {documentExists ? (
                        <>
                            <Shield className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Document Submitted</h4>
                            <p className="text-sm text-gray-500 mb-2">
                                {govtIdStatus === 'verified' 
                                    ? 'Government ID has been verified by the administration.' 
                                    : 'Government ID verification is managed by the library owner.'}
                            </p>
                            <p className="text-xs text-gray-400">(Preview restricted for privacy)</p>
                        </>
                    ) : (
                        <>
                            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">No Document</h4>
                            <p className="text-sm text-gray-500">Please upload a government ID for verification.</p>
                        </>
                    )}
                </div>

                <div className="flex justify-center">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleUpload}
                        className="hidden" 
                        accept="image/*,.pdf"
                    />
                    <AnimatedButton
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        icon="upload"
                    >
                        {documentExists ? 'Upload New Document' : 'Upload Document'}
                    </AnimatedButton>
                </div>
            </div>
        </div>
    )
}
