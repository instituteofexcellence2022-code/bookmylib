'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { registerOwner } from '@/actions/auth'
import { toast } from 'react-hot-toast'
import { 
    UserPlus, User, Lock, Mail, ArrowRight, Eye, EyeOff, Phone, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function OwnerRegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
            toast.error('Please fill in all fields')
            return
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        if (formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number')
            return
        }
        if (strength < 3) {
            toast.error('Password is too weak')
            return
        }
        if (!formData.agreedToTerms) {
            toast.error('You must agree to the Terms of Service')
            return
        }

        console.log('[REGISTER] Submitting form...', formData.email)
        setLoading(true)

        try {
            const data = new FormData()
            // Append all fields
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value.toString())
            })

            const result = await registerOwner(data)
            console.log('[REGISTER] Result:', result)

            if (result.success) {
                toast.success('Registration successful!')
                router.push('/owner/dashboard')
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
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link href="/owner/login" className="font-medium text-amber-600 hover:text-amber-500 transition-colors">
                        Sign in
                    </Link>
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 sm:rounded-2xl sm:px-10">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <FormInput
                            label="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            icon={User}
                            placeholder="Enter your full name"
                            required
                            className="focus:ring-amber-500"
                        />

                        <FormInput
                            label="Email Address"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            icon={Mail}
                            type="email"
                            placeholder="Enter your email"
                            required
                            className="focus:ring-amber-500"
                        />

                        <FormInput
                            label="Phone Number"
                            value={formData.phone}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                setFormData({ ...formData, phone: value })
                            }}
                            icon={Phone}
                            type="tel"
                            placeholder="10-digit phone number"
                            required
                            className="focus:ring-amber-500"
                        />

                        <div>
                            <div className="relative">
                                <FormInput
                                    label="Password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    icon={Lock}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
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
                            
                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 h-1 mb-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`flex-1 rounded-full transition-colors duration-300 ${
                                                    strength >= level ? strengthColor[strength] : 'bg-gray-200 dark:bg-gray-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {strength === 0 && 'Enter password'}
                                        {strength === 1 && 'Weak password'}
                                        {strength === 2 && 'Medium strength'}
                                        {strength >= 3 && 'Strong password'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <FormInput
                            label="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            icon={Lock}
                            type="password"
                            placeholder="Confirm your password"
                            required
                            className="focus:ring-amber-500"
                        />

                        <div className="flex items-center">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                checked={formData.agreedToTerms}
                                onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded bg-white dark:bg-gray-800 dark:border-gray-700"
                            />
                            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                I agree to the{' '}
                                <Link href="/terms" className="text-amber-600 hover:text-amber-500 font-medium">
                                    Terms of Service
                                </Link>
                                {' '}and{' '}
                                <Link href="/privacy" className="text-amber-600 hover:text-amber-500 font-medium">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>

                        <AnimatedButton
                            type="submit"
                            isLoading={loading}
                            className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25 border-transparent"
                        >
                            Create Account
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </AnimatedButton>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}