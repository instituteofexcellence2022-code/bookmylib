'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { loginStudent } from '@/actions/auth'
import { toast } from 'react-hot-toast'
import { LogIn, Mail, ArrowRight, ArrowLeft, BookOpen, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function StudentLoginPage() {
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

            const result = await loginStudent(data)

            if (result.success) {
                toast.success('Login successful')
                router.push('/student/home')
            } else {
                toast.error(result.error || 'Login failed')
            }
        } catch (error) {
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
                className="absolute top-4 left-4 p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors z-20"
            >
                <ArrowLeft className="w-6 h-6" />
            </Link>

            {/* Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-blue-500" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-sky-500" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-10 h-10" />
                    </div>
                </div>
                <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Sign in to your student account
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="bg-white dark:bg-gray-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <FormInput
                            label="Email address"
                            type="email"
                            icon={Mail}
                            required
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="you@example.com"
                        />

                        <div>
                            <div className="relative">
                                <FormInput
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link 
                                    href="/student/forgot-password" 
                                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <AnimatedButton
                            type="submit"
                            variant="primary"
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white h-10"
                            isLoading={loading}
                            icon="logIn"
                        >
                            Sign in
                        </AnimatedButton>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
                                    New to the library?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <AnimatedButton
                                variant="outline"
                                className="w-full justify-center"
                                icon="arrowRight"
                                onClick={() => router.push('/student/register')}
                            >
                                Create an account
                            </AnimatedButton>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
