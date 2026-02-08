'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Monitor, 
  Lock, 
  Smartphone, 
  Mail, 
  MessageSquare,
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTheme } from 'next-themes'

import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { changeStudentPassword, updateStudentPreferences } from '@/actions/student'
import { logout } from '@/actions/auth'

interface SettingsClientProps {
  student: any
}

const TABS = [
  { id: 'general', label: 'General', icon: Monitor },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function SettingsClient({ student }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('general')
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Preferences State
  const [preferences, setPreferences] = useState(student.preferences || {
    notifications: {
      email: true,
      sms: true,
      whatsapp: true,
      marketing: false
    }
  })

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handlePreferencesUpdate = async (newPrefs: any) => {
    setPreferences(newPrefs)
    // Debounce or immediate save? Let's do immediate for now with toast
    try {
      const result = await updateStudentPreferences(newPrefs)
      if (!result.success) {
        toast.error('Failed to save preferences')
      }
    } catch (error) {
      toast.error('Error saving preferences')
    }
  }

  const toggleNotification = (key: string) => {
    const newPrefs = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: !preferences.notifications?.[key]
      }
    }
    handlePreferencesUpdate(newPrefs)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('currentPassword', passwordData.currentPassword)
      formData.append('newPassword', passwordData.newPassword)
      formData.append('confirmPassword', passwordData.confirmPassword)

      const result = await changeStudentPassword(formData)

      if (result.success) {
        toast.success('Password changed successfully')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast.error(result.error || 'Failed to change password')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/student/login')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <AnimatedCard className="w-full md:w-64 h-fit p-2 sticky top-24">
          <nav className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </button>
              )
            })}
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </nav>
        </AnimatedCard>

        {/* Main Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <AnimatedCard>
                    <h2 className="text-lg font-semibold mb-4">Appearance</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { name: 'light', icon: Sun, label: 'Light' },
                        { name: 'dark', icon: Moon, label: 'Dark' },
                        { name: 'system', icon: Monitor, label: 'System' }
                      ].map((t) => {
                        const Icon = t.icon
                        const isSelected = theme === t.name
                        return (
                          <button
                            key={t.name}
                            onClick={() => setTheme(t.name)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon size={24} />
                            <span className="text-sm font-medium">{t.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </AnimatedCard>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <AnimatedCard>
                    <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-500" />
                        Change Password
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Ensure your account is secure by using a strong password.
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <FormInput
                        type="password"
                        icon={Lock}
                        placeholder="Current Password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                          type="password"
                          icon={Lock}
                          placeholder="New Password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          required
                        />
                        <FormInput
                          type="password"
                          icon={Lock}
                          placeholder="Confirm New Password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                        >
                          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Update Password
                        </Button>
                      </div>
                    </form>
                  </AnimatedCard>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <AnimatedCard>
                    <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
                    <div className="space-y-6">
                      {[
                        { key: 'email', label: 'Email Notifications', desc: 'Receive updates about your subscription and payments via email.', icon: Mail },
                        { key: 'sms', label: 'SMS Notifications', desc: 'Get important alerts and OTPs via SMS.', icon: Smartphone },
                        { key: 'whatsapp', label: 'WhatsApp Updates', desc: 'Receive seat confirmations and daily summaries on WhatsApp.', icon: MessageSquare }
                      ].map((item) => {
                        const Icon = item.icon
                        const isEnabled = preferences.notifications?.[item.key]
                        return (
                          <div key={item.key} className="flex items-start justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex gap-4">
                              <div className={`p-2 rounded-lg ${isEnabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                                <Icon size={20} />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{item.label}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-sm">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleNotification(item.key)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </AnimatedCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}