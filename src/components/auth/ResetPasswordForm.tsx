'use client'

import { useState } from 'react'
import { forgotPassword, resetPassword } from '@/actions/auth'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/button'
import { Lock, Loader2, CheckCircle, AlertCircle, Mail, KeyRound } from 'lucide-react'
import Link from 'next/link'

interface ResetPasswordFormProps {
    userType: 'owner' | 'staff' | 'student'
    token?: string
}

export function ResetPasswordForm({ userType, token: initialToken }: ResetPasswordFormProps) {
    const [step, setStep] = useState<'email' | 'otp'>('email')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function handleEmailSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)
        
        const emailInput = formData.get('email') as string
        setEmail(emailInput)

        try {
            const result = await forgotPassword(formData)
            if (result.success) {
                setStep('otp')
            } else {
                setError(result.error || 'Failed to send OTP')
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleResetSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        formData.append('userType', userType)
        formData.append('email', email)

        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }

        try {
            const result = await resetPassword(formData)
            if (result.success) {
                setSuccess(true)
            } else {
                setError(result.error || 'Failed to reset password')
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Password Reset!</h2>
                    <p className="text-gray-500 mt-2">
                        Your password has been successfully updated. You can now log in with your new password.
                    </p>
                </div>
                <Button asChild className="w-full" size="lg">
                    <Link href={`/${userType}/login`}>
                        Back to Login
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">
                    {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                </h1>
                <p className="text-gray-500">
                    {step === 'email' 
                        ? 'Enter your email to receive a verification code.' 
                        : `Enter the code sent to ${email} and your new password.`}
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {step === 'email' ? (
                <form action={handleEmailSubmit} className="space-y-4">
                     <FormInput
                        id="email"
                        name="email"
                        type="email"
                        label="Email Address"
                        placeholder="you@example.com"
                        icon={Mail}
                        required
                    />
                    <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending Code...
                            </>
                        ) : (
                            'Send Verification Code'
                        )}
                    </Button>
                     <div className="text-center">
                        <Link href={`/${userType}/login`} className="text-sm text-blue-600 hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </form>
            ) : (
                <form action={handleResetSubmit} className="space-y-4">
                    <FormInput
                        id="otp"
                        name="otp"
                        type="text"
                        label="Verification Code (OTP)"
                        placeholder="123456"
                        icon={KeyRound}
                        required
                        maxLength={6}
                        className="tracking-widest"
                    />

                    <FormInput
                        id="password"
                        name="password"
                        type="password"
                        label="New Password"
                        placeholder="Enter new password"
                        icon={Lock}
                        required
                        minLength={6}
                    />

                    <FormInput
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        label="Confirm Password"
                        placeholder="Confirm new password"
                        icon={Lock}
                        required
                        minLength={6}
                    />

                    <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </Button>
                    
                    <div className="text-center">
                         <button 
                            type="button"
                            onClick={() => setStep('email')}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Change Email
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
