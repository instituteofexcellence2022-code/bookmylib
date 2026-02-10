'use client'

import { useState } from 'react'
import { AcceptPaymentForm } from './AcceptPaymentForm'
import { VerifyPaymentList } from './VerifyPaymentList'
import { AddStudentForm } from '@/components/owner/students/AddStudentForm'
import { UserPlus, Users, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AcceptPaymentClient({ initialStudentId }: { initialStudentId?: string }) {
    const [activeTab, setActiveTab] = useState<'existing' | 'new' | 'verify'>('existing')
    const [createdStudentId, setCreatedStudentId] = useState<string | undefined>(undefined)

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-full md:w-fit">
                <button
                    onClick={() => {
                        setActiveTab('new')
                        setCreatedStudentId(undefined)
                    }}
                    className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'new'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <UserPlus size={16} className="mr-2 shrink-0" />
                    <span className="truncate">New</span>
                </button>
                <button
                    onClick={() => setActiveTab('existing')}
                    className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'existing'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <Users size={16} className="mr-2 shrink-0" />
                    <span className="truncate">Existing</span>
                </button>
                <button
                    onClick={() => setActiveTab('verify')}
                    className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'verify'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <ShieldCheck size={16} className="mr-2 shrink-0" />
                    <span className="truncate">Verify</span>
                </button>
            </div>

            {/* Content */}
            <div className="mt-4">
                {activeTab === 'new' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                        <AddStudentForm 
                            onSuccess={(id) => {
                                setCreatedStudentId(id)
                                setActiveTab('existing')
                            }}
                            onCancel={() => setActiveTab('existing')}
                        />
                    </div>
                )}

                {activeTab === 'existing' && (
                    <AcceptPaymentForm initialStudentId={createdStudentId || initialStudentId} />
                )}

                {activeTab === 'verify' && (
                    <VerifyPaymentList />
                )}
            </div>
        </div>
    )
}
