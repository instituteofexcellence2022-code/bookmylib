'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { loginStaff } from '@/actions/auth'
import { toast } from 'react-hot-toast'
import { Users, Lock, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function StaffLoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    
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
            if (rememberMe) data.append('rememberMe', 'true')

            const result = await loginStaff(data)

            if (result.success) {
                toast.success('Login successful')
                router.push('/staff/dashboard')
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
            {/* Back to Home */}
            <Link 
                href="/" 
                className="absolute top-4 left-4 p-2 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors z-20"
            >
                <ArrowLeft className="w-6 h-6" />
            </Link>

            {/* Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-emerald-500" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-teal-500" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="flex justify-center">
                     <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Staff Portal
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Sign in to access your dashboard
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 sm:rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <FormInput
                            label="Email address"
                            type="email"
                            icon={Mail}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="focus:ring-emerald-500"
                        />

                        <div className="relative">
                            <FormInput
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                icon={Lock}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="focus:ring-emerald-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link
                                    href="/staff/forgot-password"
                                    className="font-medium text-emerald-600 hover:text-emerald-500"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <AnimatedButton
                                type="submit"
                                isLoading={loading}
                                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                                icon="logIn"
                            >
                                Sign in
                            </AnimatedButton>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
