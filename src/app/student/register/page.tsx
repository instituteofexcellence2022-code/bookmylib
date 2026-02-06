'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/button'
import { registerStudent, initiateEmailVerification, confirmEmailVerification } from '@/actions/auth'
import { toast } from 'react-hot-toast'
import { 
    UserPlus, User, Lock, Mail, Eye, EyeOff, Phone, ArrowLeft, Gift, Calendar, CheckCircle, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const referralCode = searchParams.get('ref')
    
    const [loading, setLoading] = useState(false)
    const [emailVerified, setEmailVerified] = useState(false)
    const [showEmailOtp, setShowEmailOtp] = useState(false)
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [otp, setOtp] = useState('')
    const [resendTimer, setResendTimer] = useState(0)
    const [showPassword, setShowPassword] = useState(false)
    const [authMethod, setAuthMethod] = useState<'password' | 'dob'>('password')
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dob: '',
        password: '',
        confirmPassword: '',
        agreedToTerms: false
    })

    const getPasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength += 1
        if (/[A-Z]/.test(password)) strength += 1
        if (/[0-9]/.test(password)) strength += 1
        if (/[^A-Za-z0-9]/.test(password)) strength += 1
        return strength
    }

    const strength = getPasswordStrength(formData.password)
    const strengthColor = [
        'bg-gray-200 dark:bg-gray-700',
        'bg-red-500',
        'bg-orange-500',
        'bg-yellow-500',
        'bg-green-500'
    ]

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [resendTimer])

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, email: e.target.value }))
        if (emailVerified) {
            setEmailVerified(false)
        }
    }

    const handleVerifyEmail = async () => {
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
            toast.error('Please enter a valid email')
            return
        }
        setVerifyingEmail(true)
        try {
            const res = await initiateEmailVerification(formData.email, formData.name)
            if (res.success) {
                setShowEmailOtp(true)
                toast.success('OTP sent to your email')
            } else {
                toast.error(res.error || 'Failed to send OTP')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setVerifyingEmail(false)
        }
    }

    const handleConfirmOtp = async () => {
        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP')
            return
        }
        setVerifyingEmail(true)
        try {
            const res = await confirmEmailVerification(formData.email, otp)
            if (res.success) {
                setEmailVerified(true)
                setShowEmailOtp(false)
                setOtp('')
                toast.success('Email verified successfully')
            } else {
                toast.error(res.error || 'Invalid OTP')
            }
        } catch (error) {
            toast.error('Verification failed')
        } finally {
            setVerifyingEmail(false)
        }
    }

    const handleResendOtp = async () => {
        if (resendTimer > 0) return
        
        setVerifyingEmail(true)
        try {
            const res = await initiateEmailVerification(formData.email, formData.name)
            if (res.success) {
                setResendTimer(60)
                toast.success('OTP resent successfully')
            } else {
                toast.error(res.error || 'Failed to resend OTP')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setVerifyingEmail(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name || !formData.email) {
            toast.error('Please fill in all fields')
            return
        }

        if (!emailVerified) {
            toast.error('Please verify your email address first')
            return
        }

        if (authMethod === 'password') {
            if (!formData.password || !formData.confirmPassword) {
                toast.error('Please fill in password fields')
                return
            }
            if (formData.password !== formData.confirmPassword) {
                toast.error('Passwords do not match')
                return
            }
            if (strength < 3) {
                toast.error('Password is too weak')
                return
            }
        } else {
            if (!formData.dob) {
                toast.error('Please enter your Date of Birth')
                return
            }
        }

        if (formData.phone && formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number')
            return
        }

        if (!formData.agreedToTerms) {
            toast.error('You must agree to the Terms of Service')
            return
        }

        setLoading(true)

        try {
            const data = new FormData()
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value.toString())
            })
            
            if (referralCode) {
                data.append('referralCode', referralCode)
            }

            const result = await registerStudent(data)

            if (result.success) {
                toast.success('Registration successful! Redirecting...')
                router.push('/student/login')
            } else {
                toast.error(result.error || 'Registration failed')
            }
        } catch (error) {
            console.error('[REGISTER] Client error:', error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="flex justify-center mb-2">
                    <div className="p-2 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <UserPlus className="w-8 h-8" />
                    </div>
                </div>
                <h2 className="mt-1 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Create student account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link href="/student/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                        Sign in instead
                    </Link>
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 sm:mx-auto sm:w-full sm:max-w-lg relative z-10"
            >
                <div className="bg-white dark:bg-gray-900 py-6 px-4 shadow-xl sm:rounded-2xl sm:px-8 border border-gray-100 dark:border-gray-800">
                    {referralCode && (
                        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300">
                                <Gift className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Referral Code Applied!</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">You&apos;ll get a special offer on your first booking.</p>
                            </div>
                        </div>
                    )}
                
                    <form className="space-y-4" onSubmit={handleRegister}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                                label="Full Name"
                                type="text"
                                icon={User}
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="John Doe"
                            />

                            <FormInput
                                label="Phone Number (Optional)"
                                type="tel"
                                icon={Phone}
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                placeholder="Enter your phone number"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <FormInput
                                        label="Email address"
                                        type="email"
                                        icon={Mail}
                                        required
                                        value={formData.email}
                                        onChange={handleEmailChange}
                                        placeholder="you@example.com"
                                        className={emailVerified ? "border-green-500 focus:ring-green-500" : ""}
                                    />
                                </div>
                                {!emailVerified && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleVerifyEmail}
                                        className="mb-[2px] h-[42px]"
                                        disabled={!formData.email || verifyingEmail}
                                    >
                                        {verifyingEmail ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Verify'
                                        )}
                                    </Button>
                                )}
                                {emailVerified && (
                                    <div className="mb-[2px] h-[42px] flex items-center px-3 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span className="text-sm font-medium">Verified</span>
                                    </div>
                                )}
                            </div>
                            
                            <AnimatePresence>
                                {showEmailOtp && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            Enter the 6-digit code sent to {formData.email}
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                                                placeholder="000000"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleConfirmOtp}
                                                disabled={otp.length !== 6 || verifyingEmail}
                                            >
                                                {verifyingEmail ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    'Confirm'
                                                )}
                                            </Button>
                                        </div>
                                        <div className="mt-3 text-right">
                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                disabled={resendTimer > 0 || verifyingEmail}
                                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {resendTimer > 0 
                                                    ? `Resend code in ${resendTimer}s` 
                                                    : "Didn't receive code? Resend"}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setAuthMethod('password')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                                    authMethod === 'password'
                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <Lock className="w-4 h-4" />
                                Create Password
                            </button>
                            <button
                                type="button"
                                onClick={() => setAuthMethod('dob')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                                    authMethod === 'dob'
                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <Calendar className="w-4 h-4" />
                                Use Date of Birth
                            </button>
                        </div>

                        {authMethod === 'password' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    
                                    {formData.password && (
                                        <div className="mt-1">
                                            <div className="flex gap-1 h-1">
                                                {[1, 2, 3, 4].map((level) => (
                                                    <div 
                                                        key={level}
                                                        className={`flex-1 rounded-full transition-colors duration-300 ${
                                                            strength >= level ? strengthColor[strength] : 'bg-gray-100 dark:bg-gray-800'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <FormInput
                                    label="Confirm Password"
                                    type="password"
                                    icon={Lock}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="••••••••"
                                />
                            </div>
                        ) : (
                            <FormInput
                                label="Date of Birth"
                                type="date"
                                icon={Calendar}
                                required
                                value={formData.dob}
                                onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                            />
                        )}

                        <div className="flex items-center">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                required
                                checked={formData.agreedToTerms}
                                onChange={(e) => setFormData(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                            />
                            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                I agree to the <Link href="/terms" className="text-blue-600 hover:text-blue-500">Terms</Link> & <Link href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy</Link>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white py-2"
                            disabled={!emailVerified || loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Create Account
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </motion.div>
        </>
    )
}

export default function StudentRegisterPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-6 sm:px-6 lg:px-8 relative overflow-hidden">
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

            <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
                <RegisterForm />
            </Suspense>
        </div>
    )
}
