'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { loginAdmin } from '@/actions/admin/platform-auth'
import { toast } from 'react-hot-toast'
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

function AdminLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
    const [loading, setLoading] = useState(false)
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = new FormData()
            data.append('email', formData.email)
            data.append('password', formData.password)

            const result = await loginAdmin(data)

            if (result.success) {
                toast.success('Admin login successful')
                router.refresh()
                router.push(callbackUrl)
            } else {
                toast.error(result.error || 'Login failed')
            }
        } catch (error) {
            console.error('Login error:', error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-purple-500" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-indigo-500" />
            </div>

            <div className="absolute top-4 left-4 z-20">
                <Link href="/" className="px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 backdrop-blur-md">
                    Home
                </Link>
            </div>
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-purple-500/20">
                    <ShieldCheck className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Platform Console
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Sign in with your platform credentials
                </p>
            </motion.div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 sm:rounded-2xl sm:px-10"
                >
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <FormInput
                            id="email"
                            type="email"
                            label="Email address"
                            icon={Mail}
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="focus:ring-purple-500"
                        />

                        <FormInput
                            id="password"
                            type="password"
                            label="Password"
                            icon={Lock}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="focus:ring-purple-500"
                        />

                        <AnimatedButton
                            type="submit"
                            isLoading={loading}
                            variant="purple"
                            className="w-full justify-center h-10"
                        >
                            Sign in
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </AnimatedButton>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-gray-900 dark:text-white">Loading...</div>}>
            <AdminLoginForm />
        </Suspense>
    )
}
