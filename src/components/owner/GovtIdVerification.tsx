'use client'

import React, { useState } from 'react'
import { AlertCircle, Maximize2, X } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { verifyStudentGovtId } from '@/actions/owner/students'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface GovtIdVerificationProps {
    studentId: string
    govtIdUrl: string | null
    govtIdStatus: string
}

export default function GovtIdVerification({ studentId, govtIdUrl, govtIdStatus }: GovtIdVerificationProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const handleVerify = async (status: 'verified' | 'rejected') => {
        if (!confirm(`Are you sure you want to mark this ID as ${status}?`)) return

        setLoading(true)
        try {
            const result = await verifyStudentGovtId(studentId, status)
            if (result.success) {
                toast.success(`ID marked as ${status}`)
                router.refresh()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!govtIdUrl) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">No ID Uploaded</h3>
                <p className="text-sm text-gray-500 mt-1">Student has not uploaded a government ID yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Government ID</h3>
                        <p className="text-sm text-gray-500">Verify the student&apos;s uploaded identity document</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                        govtIdStatus === 'verified' ? 'bg-green-100 text-green-700' :
                        govtIdStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        govtIdStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {govtIdStatus}
                    </div>
                </div>

                <div className="relative group aspect-video w-full max-w-md mx-auto bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
                    <Image 
                        src={govtIdUrl} 
                        alt="Student Government ID" 
                        fill
                        className="object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button 
                            onClick={() => setShowPreview(true)}
                            className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all"
                        >
                            <Maximize2 size={16} />
                            View Fullscreen
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <AnimatedButton
                        onClick={() => handleVerify('verified')}
                        isLoading={loading}
                        disabled={govtIdStatus === 'verified'}
                        className={`flex-1 ${govtIdStatus === 'verified' ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        icon="check"
                    >
                        Verify ID
                    </AnimatedButton>
                    
                    <AnimatedButton
                        onClick={() => handleVerify('rejected')}
                        isLoading={loading}
                        disabled={govtIdStatus === 'rejected'}
                        className={`flex-1 ${govtIdStatus === 'rejected' ? 'opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        icon="close"
                    >
                        Reject ID
                    </AnimatedButton>
                </div>
            </div>

            {/* Fullscreen Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setShowPreview(false)}
                    >
                        <button 
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                            onClick={() => setShowPreview(false)}
                        >
                            <X size={32} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={govtIdUrl} 
                            alt="Full Preview" 
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
