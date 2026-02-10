'use client'

import React, { useState } from 'react'
import { StaffAcceptPaymentForm } from './StaffAcceptPaymentForm'
import { UserPlus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

export function StaffAcceptPaymentClient({ initialStudentId }: { initialStudentId?: string }) {
    const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
    const router = useRouter()

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-full md:w-fit">
                <button
                    onClick={() => setActiveTab('existing')}
                    className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'existing'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <Users size={16} className="mr-2 shrink-0" />
                    <span className="truncate">Existing Student</span>
                </button>
                <button
                    onClick={() => setActiveTab('new')}
                    className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'new'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <UserPlus size={16} className="mr-2 shrink-0" />
                    <span className="truncate">New Student</span>
                </button>
            </div>

            {/* Content */}
            <div className="mt-4">
                {activeTab === 'new' && (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                            <UserPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Add New Student
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                            To accept payment from a new student, you first need to create their profile in the system.
                        </p>
                        <AnimatedButton 
                            onClick={() => router.push('/staff/students?action=add')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                        >
                            Go to Students Page
                        </AnimatedButton>
                    </div>
                )}

                {activeTab === 'existing' && (
                    <StaffAcceptPaymentForm initialStudentId={initialStudentId} />
                )}
            </div>
        </div>
    )
}
