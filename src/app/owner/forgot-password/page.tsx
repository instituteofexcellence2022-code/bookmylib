'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { toast } from 'react-hot-toast'
import { Mail, ArrowLeft, Shield, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
// import { resetOwnerPassword } from '@/actions/auth' // We will implement this

export default function OwnerForgotPasswordPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [email, setEmail] = useState('')

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Mock API call for now, or implement real one
        try {
            // await new Promise(resolve => setTimeout(resolve, 1500))
            // const result = await resetOwnerPassword(email)
            // if (result.success) ...
            
            // Simulating success for UI demo
            setTimeout(() => {
                setSent(true)
                setLoading(false)
                toast.success('Reset link sent to your email')
            }, 1500)
        } catch (error) {
            toast.error('An error occurred')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Back to Login */}
            <Link 
                href="/owner/login" 
                className="absolute top-4 left-4 p-2 text-gray-600 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 transition-colors z-20"
            >
                <ArrowLeft className="w-6 h-6" />
            </Link>

            {/* Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-amber-500" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-orange-500" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Reset Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Enter your email to receive reset instructions
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 sm:rounded-2xl sm:px-10">
                    {!sent ? (
                        <form className="space-y-6" onSubmit={handleReset}>
                            <FormInput
                                label="Email address"
                                type="email"
                                icon={Mail}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="focus:ring-amber-500"
                            />

                            <AnimatedButton
                                type="submit"
                                isLoading={loading}
                                className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25 border-transparent"
                            >
                                Send Reset Link
                            </AnimatedButton>
                        </form>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Check your email</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                We sent a password reset link to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
                            </p>
                            <div className="mt-6">
                                <Link
                                    href="/owner/login"
                                    className="text-sm font-medium text-amber-600 hover:text-amber-500"
                                >
                                    Back to sign in
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
