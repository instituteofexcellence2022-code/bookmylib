'use client'

import React, { useState } from 'react'
import { 
    Copy, Share2, Users, Gift, Ticket, 
    CheckCircle2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Referral {
    id: string
    referrerCouponCode?: string | null
    status: string
    createdAt: string | Date
    referee?: {
        name?: string
    }
}

interface ReferralSettings {
    all?: any
    refereeReward?: { type: string; value: number }
    refereeDiscountType?: string
    refereeDiscountValue?: number
    referrerReward?: { type: string; value: number }
    referrerDiscountType?: string
    referrerDiscountValue?: number
    [key: string]: any
}

interface ReferralClientProps {
    data: {
        referralCode: string | null
        referrals: Referral[]
        libraryName: string | null | undefined
        branchName?: string | null | undefined
        settings: ReferralSettings
        stats: {
            totalReferrals: number
            totalCoupons: number
            activeCoupons: number
        }
    }
}

export default function ReferralClient({ data }: ReferralClientProps) {
    const { referralCode, referrals, libraryName, branchName, settings, stats } = data
    const [copied, setCopied] = useState(false)

    // Extract settings with fallback to support both old and new formats
    const getRewardSettings = () => {
        // Try to get settings from 'all' or root
        const s = settings?.all || settings || {}
        
        // Referee (Friend) - Support nested reward object or flat legacy properties
        const refereeType = s.refereeReward?.type || s.refereeDiscountType || 'fixed'
        const refereeValue = s.refereeReward?.value || s.refereeDiscountValue || 50
        
        // Referrer (You)
        const referrerType = s.referrerReward?.type || s.referrerDiscountType || 'fixed'
        const referrerValue = s.referrerReward?.value || s.referrerDiscountValue || 100
        
        return { refereeType, refereeValue, referrerType, referrerValue }
    }

    const { refereeType, refereeValue, referrerType, referrerValue } = getRewardSettings()

    const code = referralCode || ''
    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/student/register?ref=${code}`
        : ''

    const copyToClipboard = async () => {
        if (!code) return
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            toast.success('Referral link copied!')
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error('Failed to copy link')
        }
    }

    const shareOnWhatsApp = () => {
        if (!code) return
        const text = `Join ${branchName || 'BookMyLib'} using my referral code *${code}* and get a discount! Sign up here: ${shareUrl}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refer & Earn</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Invite friends to {branchName || 'the library'} and earn rewards.
                    </p>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Referrals</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalReferrals}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                <Gift className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rewards</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalCoupons}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Referral Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Share Section */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold mb-2">Share your referral code</h2>
                            <p className="text-blue-100 mb-6 max-w-lg">
                                &quot;Invite your friends! They get {refereeType === 'fixed' ? `₹${refereeValue}` : `${refereeValue}%`} off, and you earn a {referrerType === 'fixed' ? `₹${referrerValue}` : `${referrerValue}%`} coupon for every successful joining!&quot;
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-1 pl-4 flex items-center justify-between">
                                    <span className="font-mono font-bold tracking-wider text-lg">{code || 'Generating...'}</span>
                                    <button 
                                        onClick={copyToClipboard}
                                        disabled={!code}
                                        className="p-2 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Copy Link"
                                    >
                                        {copied ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <button 
                                    onClick={shareOnWhatsApp}
                                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                                >
                                    <Share2 className="w-5 h-5" />
                                    WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">How it works</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                                    <Share2 className="w-6 h-6" />
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">1. Share Code</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Send your unique code to friends</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">2. Friend Joins</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">They register & subscribe using your code</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                                    <Gift className="w-6 h-6" />
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">3. Earn Rewards</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">You get coupons, they get discounts</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Coupons & History */}
                <div className="space-y-6">
                    {/* Active Coupons */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Coupons</h3>
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
                                {stats.activeCoupons} Active
                            </span>
                        </div>
                        
                        {stats.activeCoupons > 0 ? (
                            <div className="space-y-3">
                                {referrals
                                    .filter(r => r.referrerCouponCode && r.status === 'completed')
                                    .map((referral) => (
                                    <div key={referral.id} className="p-3 border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Discount Coupon</p>
                                            <p className="font-mono font-bold text-gray-900 dark:text-white">{referral.referrerCouponCode}</p>
                                        </div>
                                        <Ticket className="w-5 h-5 text-blue-500" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No active coupons yet</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Referrals */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Referrals</h3>
                        <div className="space-y-4">
                            {referrals.length > 0 ? (
                                referrals.map((referral) => (
                                    <div key={referral.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-bold">
                                                {referral.referee?.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {referral.referee?.name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(referral.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            {referral.status === 'completed' ? (
                                                <span className="inline-flex items-center text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                                    Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">No referrals yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
