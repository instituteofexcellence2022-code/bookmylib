'use client'

import { useState } from 'react'
import { resetPassword } from '@/actions/auth'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/button'
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface ResetPasswordFormProps {
    userType: 'owner' | 'staff' | 'student'
    token: string
}

export function ResetPasswordForm({ userType, token }: ResetPasswordFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        formData.append('userType', userType)
        formData.append('token', token)

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
                <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
                <p className="text-gray-500">Enter your new password below.</p>
            </div>

            <form action={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

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
            </form>
        </div>
    )
}
