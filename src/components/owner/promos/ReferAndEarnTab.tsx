'use client'

import React, { useState, useEffect } from 'react'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { Gift, Users, Copy, Check, Search, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getOwnerReferrals } from '@/actions/promo'
import { format } from 'date-fns'

export function ReferAndEarnTab() {
  const [enabled, setEnabled] = useState(false)
  const [rewardType, setRewardType] = useState('fixed') // fixed or percentage
  const [referrerReward, setReferrerReward] = useState('100')
  const [refereeReward, setRefereeReward] = useState('50')
  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const data = await getOwnerReferrals()
        setReferrals(data)
      } catch (error) {
        console.error(error)
        toast.error('Failed to load referrals')
      } finally {
        setLoading(false)
      }
    }
    fetchReferrals()
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement save logic
    toast.success('Referral settings saved successfully')
  }

  const copyLink = () => {
    navigator.clipboard.writeText('https://bookmylib.com/register?ref=LIBRARY123')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Referral link copied')
  }

  const filteredReferrals = referrals.filter(ref => 
    ref.referrer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ref.referee.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalReferrals = referrals.length
  const totalPaid = referrals.reduce((sum, ref) => sum + (ref.rewardAmount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Card */}
        <CompactCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Program Settings</h3>
              <p className="text-sm text-gray-500">Configure rewards for referrals</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Referral Program</span>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className={`space-y-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <FormSelect
                label="Reward Type"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                options={[
                  { label: 'Fixed Amount (₹)', value: 'fixed' },
                  { label: 'Percentage (%)', value: 'percentage' }
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Referrer Gets"
                  value={referrerReward}
                  onChange={(e) => setReferrerReward(e.target.value)}
                  type="number"
                  min="0"
                  icon={rewardType === 'fixed' ? undefined : undefined}
                  placeholder="0"
                />
                <FormInput
                  label="Referee Gets"
                  value={refereeReward}
                  onChange={(e) => setRefereeReward(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                />
              </div>

              <AnimatedButton type="submit" variant="primary" fullWidth>
                Save Settings
              </AnimatedButton>
            </div>
          </form>
        </CompactCard>

        {/* Stats & Preview Card */}
        <div className="space-y-6">
          <CompactCard className="p-6">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Program Stats</h3>
                  <p className="text-sm text-gray-500">Overview of referral performance</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Referrals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalReferrals}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalPaid}</p>
                </div>
              </div>
          </CompactCard>

          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h4 className="font-semibold text-lg mb-2">How it looks for students</h4>
            <p className="text-blue-100 text-sm mb-4">
              "Invite your friends and earn {rewardType === 'fixed' ? `₹${referrerReward}` : `${referrerReward}%`} for every successful subscription!"
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between border border-white/20">
              <code className="text-sm">bookmylib.com/r/LIB123</code>
              <button 
                onClick={copyLink}
                className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <CompactCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Referral History</h3>
            <p className="text-sm text-gray-500">Detailed list of all referrals</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading referrals...</div>
        ) : filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-3 pl-4">Referrer</th>
                  <th className="pb-3">Referee</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Reward</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="text-sm">
                    <td className="py-3 pl-4">
                      <div className="font-medium text-gray-900 dark:text-white">{referral.referrer.name}</div>
                      <div className="text-xs text-gray-500">{referral.referrer.email}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{referral.referee.name}</div>
                      <div className="text-xs text-gray-500">{referral.referee.email}</div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        referral.status === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : referral.status === 'verified'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      ₹{referral.rewardAmount || 0}
                    </td>
                    <td className="py-3 text-gray-500">
                      {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-full w-fit mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-900 dark:text-white font-medium">No referrals found</p>
            <p className="text-sm text-gray-500">Share your referral link to get started!</p>
          </div>
        )}
      </CompactCard>
    </div>
  )
}
