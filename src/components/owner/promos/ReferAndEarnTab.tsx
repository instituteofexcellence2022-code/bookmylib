'use client'

import React, { useState, useEffect } from 'react'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { Gift, Users, Copy, Check, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getOwnerReferrals, getReferralSettings, saveReferralSettings } from '@/actions/promo'
import { getOwnerBranches } from '@/actions/branch'
import { format } from 'date-fns'

interface Branch {
  id: string
  name: string
}

interface BranchSettings {
  enabled?: boolean
  referrerReward?: {
    type: string
    value: number
  }
  refereeReward?: {
    type: string
    value: number
  }
}

interface ReferralSettings {
  [key: string]: BranchSettings
}

interface Referral {
  id: string
  referrer: {
    name: string
    email: string
  }
  referee: {
    name: string
    email: string
    branchId: string
  }
  status: string
  referrerCouponCode: string | null
  refereeDiscount: number | null
  createdAt: string | Date
}

export function ReferAndEarnTab() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('all')
  const [fullSettings, setFullSettings] = useState<ReferralSettings>({})
  
  const [enabled, setEnabled] = useState(false)
  
  // Referrer Settings (Coupon)
  const [referrerType, setReferrerType] = useState('fixed')
  const [referrerValue, setReferrerValue] = useState('100')
  
  // Referee Settings (Instant Discount)
  const [refereeType, setRefereeType] = useState('fixed')
  const [refereeValue, setRefereeValue] = useState('50')

  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [refs, settings, branchesResult] = await Promise.all([
          getOwnerReferrals(),
          getReferralSettings(),
          getOwnerBranches()
        ])
        setReferrals(refs as unknown as Referral[])
        if (branchesResult.success && branchesResult.data) {
          setBranches(branchesResult.data as Branch[])
        }
        
        // Handle migration/normalization of settings
        let normalizedSettings: ReferralSettings = (settings as unknown as ReferralSettings) || {}
        // If it's the old flat format, move it to 'all'
        // We check if 'enabled' exists at top level which implies old format
        // safely casting to any to check property existence for migration logic
        const rawSettings = settings as unknown as { enabled?: boolean; all?: BranchSettings }
        if (rawSettings && rawSettings.enabled !== undefined && !rawSettings.all) {
          normalizedSettings = { all: { ...rawSettings } }
        }
        
        setFullSettings(normalizedSettings)
        
        // Apply initial settings (for 'all')
        applySettings(normalizedSettings, 'all')
        
      } catch (error) {
        console.error(error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const applySettings = (settings: ReferralSettings, branchId: string) => {
    const branchSettings = settings[branchId] || settings['all'] || {}
    
    setEnabled(branchSettings.enabled ?? false)
    setReferrerType(branchSettings.referrerReward?.type ?? 'fixed')
    setReferrerValue(branchSettings.referrerReward?.value?.toString() ?? '100')
    setRefereeType(branchSettings.refereeReward?.type ?? 'fixed')
    setRefereeValue(branchSettings.refereeReward?.value?.toString() ?? '50')
  }

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId)
    applySettings(fullSettings, branchId)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const currentBranchSettings: BranchSettings = {
        enabled,
        referrerReward: {
          type: referrerType,
          value: parseFloat(referrerValue)
        },
        refereeReward: {
          type: refereeType,
          value: parseFloat(refereeValue)
        }
      }
      
      const newFullSettings = {
        ...fullSettings,
        [selectedBranchId]: currentBranchSettings
      }
      
      const res = await saveReferralSettings(newFullSettings)
      if (res.success) {
        setFullSettings(newFullSettings)
        toast.success('Referral settings saved successfully')
      } else {
        toast.error(res.error || 'Failed to save')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText('https://bookmylib.com/register?ref=LIBRARY123')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Referral link copied')
  }

  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch = ref.referrer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referee.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesBranch = selectedBranchId === 'all' || ref.referee.branchId === selectedBranchId
    
    return matchesSearch && matchesBranch
  })

  const totalReferrals = filteredReferrals.length
  const totalCoupons = filteredReferrals.filter(r => r.referrerCouponCode).length
  const totalDiscounts = filteredReferrals.reduce((sum, ref) => sum + (ref.refereeDiscount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Branch Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Refer & Earn</h2>
        <div className="w-64">
          <FormSelect
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            options={[
              { label: 'All Branches', value: 'all' },
              ...branches.map(b => ({ label: b.name, value: b.id }))
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CompactCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Referrals</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalReferrals}</h3>
            </div>
          </div>
        </CompactCard>

        <CompactCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Coupons Issued</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalCoupons}</h3>
            </div>
          </div>
        </CompactCard>

        <CompactCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Discounts Given</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalDiscounts}</h3>
            </div>
          </div>
        </CompactCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Card */}
        <CompactCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Program Settings ({selectedBranchId === 'all' ? 'Global' : branches.find(b => b.id === selectedBranchId)?.name})
              </h3>
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
              
              {/* Referrer Settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Referrer Reward (Coupon)</label>
                <div className="grid grid-cols-2 gap-4">
                  <FormSelect
                    value={referrerType}
                    onChange={(e) => setReferrerType(e.target.value)}
                    options={[
                      { label: 'Fixed (₹)', value: 'fixed' },
                      { label: 'Percent (%)', value: 'percentage' }
                    ]}
                  />
                  <FormInput
                    value={referrerValue}
                    onChange={(e) => setReferrerValue(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="Value"
                  />
                </div>
              </div>

              {/* Referee Settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Referee Reward (Instant Discount)</label>
                <div className="grid grid-cols-2 gap-4">
                  <FormSelect
                    value={refereeType}
                    onChange={(e) => setRefereeType(e.target.value)}
                    options={[
                      { label: 'Fixed (₹)', value: 'fixed' },
                      { label: 'Percent (%)', value: 'percentage' }
                    ]}
                  />
                  <FormInput
                    value={refereeValue}
                    onChange={(e) => setRefereeValue(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="Value"
                  />
                </div>
              </div>

              <AnimatedButton type="submit" variant="primary" fullWidth isLoading={saving}>
                Save Settings
              </AnimatedButton>
            </div>
          </form>
        </CompactCard>

        {/* Preview Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h4 className="font-semibold text-lg mb-2">How it looks for students</h4>
            <p className="text-blue-100 text-sm mb-4">
              &quot;Invite your friends! They get {refereeType === 'fixed' ? `₹${refereeValue}` : `${refereeValue}%`} off, and you earn a {referrerType === 'fixed' ? `₹${referrerValue}` : `${referrerValue}%`} coupon for every successful joining!&quot;
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
                  <th className="pb-3">Coupon Earned</th>
                  <th className="pb-3">Discount Given</th>
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
                        referral.status === 'completed' || referral.status === 'redeemed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {referral.referrerCouponCode ? (
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                          {referral.referrerCouponCode}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {referral.refereeDiscount ? `₹${referral.refereeDiscount}` : '-'}
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
