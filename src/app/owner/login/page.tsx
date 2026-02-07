'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { loginOwner, verifyOwnerTwoFactor } from '@/actions/auth'
import { toast } from 'react-hot-toast'
import { LogIn, ShieldCheck, Lock, Mail, ArrowRight, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

function OwnerLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/owner/dashboard'
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
    const [loading, setLoading] = useState(false)
    const [tempOwnerId, setTempOwnerId] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        code: ''
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = new FormData()
            data.append('email', formData.email)
            data.append('password', formData.password)
            if (rememberMe) data.append('rememberMe', 'true')

            const result = await loginOwner(data)

            if (result.success) {
                if (result.requiresTwoFactor) {
                    setTempOwnerId(result.ownerId as string)
                    setStep('2fa')
                    toast.success('Please verify your 2FA code')
                } else {
                    toast.success('Login successful')
                    router.push(callbackUrl)
                }
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

    const handleTwoFactorVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await verifyOwnerTwoFactor(tempOwnerId, formData.code)

            if (result.success) {
                toast.success('Verification successful')
                router.push(callbackUrl)
            } else {
                toast.error(result.error || 'Verification failed')
            }
        } catch (error) {
            console.error('2FA error:', error)
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
                    {step === 'credentials' ? 'Welcome Back' : 'Security Check'}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {step === 'credentials' 
                        ? 'Sign in to manage your library' 
                        : 'Enter your 2FA code to continue'}
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 sm:rounded-2xl sm:px-10">
                    <AnimatePresence mode="wait">
                        {step === 'credentials' ? (
                            <motion.form 
                                key="credentials"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6" 
                                onSubmit={handleLogin}
                            >
                                <FormInput
                                    label="Email address"
                                    type="email"
                                    icon={Mail}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="focus:ring-amber-500"
                                />

                                <div className="relative">
                                    <FormInput
                                        label="Password"
                                        type={showPassword ? "text" : "password"}
                                        icon={Lock}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="focus:ring-amber-500 pr-10"
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
                                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 bg-white dark:bg-gray-800 dark:border-gray-700"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Remember me
                                        </label>
                                    </div>

                                    <div className="text-sm">
                                        <Link
                                            href="/owner/reset-password"
                                            className="font-medium text-amber-600 hover:text-amber-500"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </div>

                                <div>
                                    <AnimatedButton
                                        type="submit"
                                        isLoading={loading}
                                        className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white h-10"
                                        icon="logIn"
                                    >
                                        Sign in
                                    </AnimatedButton>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.form 
                                key="2fa"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6" 
                                onSubmit={handleTwoFactorVerify}
                            >
                                <div className="flex justify-center mb-6">
                                    <div className="p-4 bg-rose-100 dark:bg-rose-900/20 rounded-full">
                                        <ShieldCheck className="w-10 h-10 text-rose-600 dark:text-rose-400" />
                                    </div>
                                </div>

                                <FormInput
                                    label="Verification Code"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    className="text-center text-2xl tracking-widest focus:ring-rose-500 font-mono"
                                />

                                <div className="flex flex-col gap-3">
                                    <AnimatedButton
                                        type="submit"
                                        isLoading={loading}
                                        className="w-full justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/25 border-transparent"
                                    >
                                        Verify
                                    </AnimatedButton>
                                    <button
                                        type="button"
                                        onClick={() => setStep('credentials')}
                                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    >
                                        Back to login
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {step === 'credentials' && (
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-transparent text-gray-500">
                                        Don&apos;t have an account?
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <AnimatedButton
                                    variant="outline"
                                    className="w-full justify-center border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => router.push('/owner/register')}
                                >
                                    Create new account
                                </AnimatedButton>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default function OwnerLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">Loading...</div>}>
            <OwnerLoginForm />
        </Suspense>
    )
}
