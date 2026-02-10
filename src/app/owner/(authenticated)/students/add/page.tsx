'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AddStudentForm } from '@/components/owner/students/AddStudentForm'

export default function AddStudentPage() {
    const router = useRouter()

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <Link href="/owner/students">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-500" />
                    </button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Student</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <AddStudentForm 
                    onSuccess={() => router.push('/owner/students')}
                    onCancel={() => router.push('/owner/students')}
                />
            </div>
        </div>
    )
}
