'use client'

import React, { useEffect, useState } from 'react'
import { getPendingVerifications, verifyStudentGovtId } from '@/actions/owner/students'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Check, X, ExternalLink, Loader2, FileText, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface StudentVerification {
  id: string
  name: string
  email: string
  phone: string
  govtIdUrl: string | null
  govtIdStatus: string
  createdAt: Date
}

export function VerifyDocumentList() {
    const [documents, setDocuments] = useState<StudentVerification[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const fetchDocuments = async () => {
        try {
            const result = await getPendingVerifications()
            if (result.success && result.data) {
                // The action returns objects with date strings or Date objects depending on serialization
                // But here we just need to display them
                setDocuments(result.data as unknown as StudentVerification[]) 
            } else {
                toast.error(result.error || 'Failed to fetch pending documents')
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch pending documents')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const handleVerify = async (studentId: string, status: 'verified' | 'rejected') => {
        setProcessingId(studentId)
        try {
            const result = await verifyStudentGovtId(studentId, status)
            if (result.success) {
                toast.success(status === 'verified' ? 'Document verified successfully' : 'Document rejected')
                fetchDocuments() // Refresh list
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            console.error(error)
            toast.error('Operation failed')
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
    }

    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No pending documents</h3>
                <p className="text-gray-500 mt-1">All documents have been verified.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {documents.map((doc, index) => (
                <AnimatedCard key={doc.id} delay={index * 0.1} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {/* Document Preview */}
                        <div className="shrink-0 flex justify-center md:justify-start">
                            {doc.govtIdUrl ? (
                                <div className="relative w-full md:w-48 h-48 md:h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group bg-gray-100 dark:bg-gray-900">
                                    <Image 
                                        src={doc.govtIdUrl} 
                                        alt="Document Proof" 
                                        fill 
                                        className="object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => setPreviewUrl(doc.govtIdUrl)}
                                            className="text-white hover:text-blue-200 p-2"
                                            title="Preview"
                                        >
                                            <Maximize2 size={20} />
                                        </button>
                                        <a href={doc.govtIdUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-200 p-2" title="Open in new tab">
                                            <ExternalLink size={20} />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full md:w-48 h-48 md:h-32 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                    <FileText size={24} />
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{doc.name}</h3>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                    <span>{doc.phone}</span>
                                    <span>•</span>
                                    <span>{doc.email}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row md:flex-col gap-2 justify-center md:min-w-[120px]">
                            <AnimatedButton
                                onClick={() => handleVerify(doc.id, 'verified')}
                                isLoading={processingId === doc.id}
                                disabled={!!processingId}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                icon="check"
                            >
                                Approve
                            </AnimatedButton>
                            
                            <AnimatedButton
                                onClick={() => handleVerify(doc.id, 'rejected')}
                                isLoading={processingId === doc.id}
                                disabled={!!processingId}
                                className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                icon="close"
                            >
                                Reject
                            </AnimatedButton>
                        </div>
                    </div>
                </AnimatedCard>
            ))}

            {/* Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full h-full bg-transparent flex items-center justify-center">
                        <Image 
                            src={previewUrl} 
                            alt="Document Preview" 
                            fill 
                            className="object-contain"
                        />
                        <button 
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                            onClick={() => setPreviewUrl(null)}
                        >
                            <X size={32} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
