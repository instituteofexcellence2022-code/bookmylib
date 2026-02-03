'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Building2, 
  MapPin, 
  Users, 
  Armchair, 
  Settings,
  Clock,
  Phone,
  Mail,
  Wifi,
  Coffee,
  Wind,
  TrendingUp,
  AlertCircle,
  Loader2,
  QrCode as QrCodeIcon,
  Download,
  RefreshCw,
  Printer,
  Shield,
  Scan,
  Search,
  UserCheck,
  ExternalLink,
  Smartphone,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import Image from 'next/image'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { getBranchById, generateBranchQR } from '@/actions/branch'
import { getBranchLogs, type ActivityLog } from '@/actions/logs'
import Link from 'next/link'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'

interface RecentActivity {
  id: number
  text: string
  time: string
  icon: React.ElementType
}

interface BranchDetail {
  id: string
  name: string
  address: string
  area?: string
  city?: string
  state?: string
  pincode?: string
  email: string
  phone: string
  status: string
  seats: { total: number; occupied: number }
  staff: number
  staffList?: any[]
  revenue: number
  monthlyRevenue?: number
  lastMonthRevenue?: number
  revenueData?: { date: string; amount: number }[]
  amenities: string[]
  libraryRules: string[]
  images: string[]
  recentActivity: RecentActivity[]
  qrCode?: string
  managerName?: string | null
  owner?: { name: string; phone?: string | null } | null
  operatingHours?: {
    openingTime: string
    closingTime: string
    is247: boolean
    workingDays: string[]
  } | null
}

const formatTime = (time: string) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'hh:mm a')
}

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom'

function getRevenueDataForRange(
  rawData: { date: string; amount: number }[] | undefined,
  timeRange: TimeRange,
  customStart: string,
  customEnd: string
) {
  if (!rawData || rawData.length === 0) return []

  const now = new Date()
  let startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  
  if (timeRange === 'today') {
    // For today, we just show the single day if it exists
    const todayStr = now.toISOString().split('T')[0]
    const todayData = rawData.find(d => d.date.startsWith(todayStr))
    return [{
      name: format(now, 'MMM dd'),
      amount: todayData ? todayData.amount : 0
    }]
  } 
  
  if (timeRange === '7d') {
    startDate.setDate(now.getDate() - 7)
  } else if (timeRange === '30d') {
    startDate.setDate(now.getDate() - 30)
  } else if (timeRange === '90d') {
    startDate.setDate(now.getDate() - 90)
  } else if (timeRange === 'custom' && customStart) {
    startDate = new Date(customStart)
  }

  // Create a map of existing data
  const dataMap = new Map(rawData.map(d => [d.date.split('T')[0], d.amount]))
  
  // Generate all days in range to ensure continuous chart
  const result = []
  const current = new Date(startDate)
  const end = customEnd ? new Date(customEnd) : new Date()

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    result.push({
      name: format(current, 'MMM dd'),
      amount: dataMap.get(dateStr) || 0
    })
    current.setDate(current.getDate() + 1)
  }

  return result
}

const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'staff', label: 'Staff' },
    { id: 'activity', label: 'Activity & Logs' },
    { id: 'qrcode', label: 'QR Code' }
  ]

  export default function BranchDetailsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('overview')
    const [isMounted, setIsMounted] = useState(false)
    const [branch, setBranch] = useState<BranchDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [timeRange, setTimeRange] = useState<TimeRange>('7d')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [qrDataUrl, setQrDataUrl] = useState('')
    const [isGeneratingQr, setIsGeneratingQr] = useState(false)
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [isLoadingLogs, setIsLoadingLogs] = useState(false)
    const [logFilter, setLogFilter] = useState<'all' | 'staff_activity' | 'attendance' | 'payment'>('all')

  const params = useParams()
  const branchId = params?.id as string

  // Fetch logs when tab becomes active
  useEffect(() => {
    if (activeTab === 'activity' && branchId) {
      const fetchLogs = async () => {
        setIsLoadingLogs(true)
        const data = await getBranchLogs(branchId)
        setLogs(data)
        setIsLoadingLogs(false)
      }
      fetchLogs()
    }
  }, [activeTab, branchId])

  useEffect(() => {
    if (branch?.qrCode) {
      // Generate a URL that works for both public access and app scanning
      const baseUrl = window.location.origin
      const qrPayload = `${baseUrl}/discover/${branch.id}?qr_code=${branch.qrCode}`
      
      QRCode.toDataURL(qrPayload)
        .then(url => setQrDataUrl(url))
        .catch(err => console.error(err))
    }
  }, [branch?.qrCode, branch?.id])

  const handleGenerateQR = async () => {
    setIsGeneratingQr(true)
    try {
        const result = await generateBranchQR(branchId)
        if (result.success && result.qrCode) {
            setBranch(prev => prev ? { ...prev, qrCode: result.qrCode } : null)
            toast.success('QR Code generated successfully')
        } else {
            toast.error(result.error || 'Failed to generate QR')
        }
    } catch (e) {
        toast.error('Error generating QR')
    } finally {
        setIsGeneratingQr(false)
    }
  }

  const handlePrintQR = () => {
    const printContent = document.getElementById('printable-qr-card');
    if (!printContent) return;

    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${branch?.name || 'Branch'} - QR Poster</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-container { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: white; }
              .poster { width: 100%; max-width: 210mm; padding: 20px; box-sizing: border-box; }
            </style>
          </head>
          <body>
            <div class="print-container">
                <div class="poster">
                    ${printContent.innerHTML}
                </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  useEffect(() => {
    setIsMounted(true)
    
    const fetchBranch = async () => {
      if (!branchId) return
      
      try {
        const data = await getBranchById(branchId)
        if (data) {
          setBranch({
            ...data,
            amenities: Array.isArray(data.amenities) ? data.amenities : [],
            libraryRules: Array.isArray(data.libraryRules) ? data.libraryRules : [],
            images: (() => {
              try {
                const parsed = data.images ? JSON.parse(data.images) : [];
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })(),
            status: data.isActive ? 'active' : 'maintenance',
            staff: data.staffCount,
            staffList: data.staffList,
            managerName: data.managerName,
            owner: data.owner,
            email: data.contactEmail || '', 
            phone: data.contactPhone || '',
            recentActivity: [] // Not implemented yet
          } as BranchDetail)
        }
      } catch (error) {
        console.error('Failed to fetch branch', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranch()
  }, [branchId])

  if (!isMounted) return null

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
          <AlertCircle className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branch Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400">The branch you are looking for does not exist.</p>
        <AnimatedButton onClick={() => router.push('/owner/branches')}>
          Back to Branches
        </AnimatedButton>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button onClick={() => router.back()} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Branches
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">{branch.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{branch.name}</h1>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                  {branch.status.toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {(() => {
                    // Combine all parts, split by comma, trim, and deduplicate
                    const rawParts = [branch.address, (branch as any).area, (branch as any).city, (branch as any).state]
                      .filter(Boolean)
                      .join(', ')
                      .split(',')
                      .map(part => part.trim())
                      .filter(part => part.length > 0);
                    
                    return Array.from(new Set(rawParts)).join(', ');
                  })()}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/owner/branches/${branch.id}/edit`}>
              <AnimatedButton 
                variant="outline" 
                size="sm" 
                icon="edit"
              >
                Edit Branch
              </AnimatedButton>
            </Link>
            <AnimatedButton variant="ghost" size="sm" icon="moreVertical">
              <span className="sr-only">More options</span>
            </AnimatedButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-3 text-sm font-medium transition-colors outline-none ${
                  activeTab === tab.id
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column - Stats & Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Branch Images */}
              {branch.images && branch.images.length > 0 && (
                <CompactCard>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Branch Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {branch.images.map((url, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <Image
                          src={url}
                          alt={`Branch image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      </div>
                    ))}
                  </div>
                </CompactCard>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CompactCard>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                      <Armchair className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Occupancy</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {branch.seats.total > 0 ? Math.round((branch.seats.occupied / branch.seats.total) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${branch.seats.total > 0 ? (branch.seats.occupied / branch.seats.total) * 100 : 0}%` }}
                    />
                  </div>
                </CompactCard>
                <CompactCard>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Active Staff</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {branch.staff} Members
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(3, branch.staff))].map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white dark:border-gray-800" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">On duty now</span>
                  </div>
                </CompactCard>
                <CompactCard>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ₹{((branch.monthlyRevenue || 0) / 1000).toFixed(1)}k
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${
                    ((branch.monthlyRevenue || 0) >= (branch.lastMonthRevenue || 0)) 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${((branch.monthlyRevenue || 0) < (branch.lastMonthRevenue || 0)) ? 'rotate-180' : ''}`} />
                    <span>
                      {(() => {
                        const current = branch.monthlyRevenue || 0
                        const last = branch.lastMonthRevenue || 0
                        if (last === 0) return current > 0 ? '+100%' : '0%'
                        const percent = ((current - last) / last) * 100
                        return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}% vs last month`
                      })()}
                    </span>
                  </div>
                </CompactCard>
              </div>

              {/* Revenue Chart */}
              <CompactCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Overview</h3>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm bg-transparent border-none text-gray-500 focus:ring-0"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    >
                      <option value="today">Today</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 3 Months</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    {timeRange === 'custom' && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                        />
                        <span>-</span>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getRevenueDataForRange(branch.revenueData, timeRange, customStart, customEnd)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#F3F4F6' }}
                      />
                      <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CompactCard>

              {/* Contact & Info */}
              <CompactCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Address</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {[branch.address, branch.area, branch.city, branch.state, branch.pincode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{branch.email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Phone</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{branch.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Operating Hours</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {branch.operatingHours?.is247 
                            ? 'Open 24 Hours' 
                            : branch.operatingHours 
                              ? `${formatTime(branch.operatingHours.openingTime)} - ${formatTime(branch.operatingHours.closingTime)}`
                              : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CompactCard>
            </div>

            {/* Right Column - Amenities & Activity */}
            <div className="space-y-6">
              <CompactCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Amenities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {branch.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {amenity.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CompactCard>

              <CompactCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Library Rules
                </h3>
                {branch.libraryRules && branch.libraryRules.length > 0 ? (
                  <ul className="space-y-3">
                    {branch.libraryRules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No rules specified for this branch.</p>
                )}
              </CompactCard>

              <CompactCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {branch.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full h-fit">
                        <activity.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{activity.text}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                  {branch.recentActivity.length === 0 && (
                     <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
                  )}
                </div>
              </CompactCard>
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
             <CompactCard>
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Members</h3>
                 <Link href="/owner/staff/add">
                    <AnimatedButton variant="outline" size="sm" icon="add">Add Staff</AnimatedButton>
                 </Link>
               </div>
               <div className="space-y-4">
                 {branch.staffList && branch.staffList.length > 0 ? (
                    branch.staffList.map((staff: any) => (
                   <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-medium overflow-hidden">
                         {staff.image ? (
                           <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                         ) : (
                           staff.name.split(' ').map((n: string) => n[0]).join('')
                         )}
                       </div>
                       <div>
                         <p className="font-medium text-gray-900 dark:text-white">{staff.name}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">{staff.role}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                         staff.status === 'active' 
                           ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                           : staff.status === 'on_leave'
                           ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                           : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                       }`}>
                         {staff.status.replace('_', ' ').toUpperCase()}
                       </span>
                       <Link href={`/owner/staff/${staff.id}/edit`}>
                        <AnimatedButton variant="ghost" size="sm" icon="edit">
                            Edit
                        </AnimatedButton>
                       </Link>
                     </div>
                   </div>
                 ))
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No staff members found for this branch.
                    </div>
                )}
               </div>
             </CompactCard>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
             <CompactCard>
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
                 <select
                   value={logFilter}
                   onChange={(e) => setLogFilter(e.target.value as any)}
                   className="text-sm bg-transparent border-none text-gray-500 focus:ring-0 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                 >
                   <option value="all">All Activity</option>
                   <option value="attendance">Attendance</option>
                   <option value="payment">Payments</option>
                   <option value="staff_activity">Staff Actions</option>
                 </select>
               </div>
               
               {isLoadingLogs ? (
                 <div className="flex justify-center py-12">
                   <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                 </div>
               ) : logs.length > 0 ? (
                 <div className="space-y-4">
                   {logs
                     .filter(log => logFilter === 'all' || log.type === logFilter)
                     .map((log) => (
                     <div key={log.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                       <div className={`p-2.5 rounded-full h-fit shrink-0 ${
                         log.type === 'payment' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                         log.type === 'attendance' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                         'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                       }`}>
                         {log.type === 'payment' ? <TrendingUp className="w-5 h-5" /> :
                          log.type === 'attendance' ? <Clock className="w-5 h-5" /> :
                          <Users className="w-5 h-5" />}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-start justify-between gap-4">
                           <div>
                             <p className="font-medium text-gray-900 dark:text-white">{log.title}</p>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{log.description}</p>
                           </div>
                           <span className="text-xs text-gray-400 whitespace-nowrap pt-1">
                             {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                           </span>
                         </div>
                         <div className="mt-3 space-y-2">
                           {log.user && (
                             <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                               {log.user.image ? (
                                 <img 
                                   src={log.user.image} 
                                   alt={log.user.name} 
                                   className="w-5 h-5 rounded-full object-cover" 
                                 />
                               ) : (
                                 <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                                   {log.user.name.charAt(0)}
                                 </div>
                               )}
                               <span className="font-semibold text-gray-700 dark:text-gray-300">{log.user.name}</span>
                               <span className="text-gray-300 dark:text-gray-600">•</span>
                               <span className="text-gray-500 dark:text-gray-400">{log.user.role}</span>
                             </div>
                           )}

                           {log.actor && (
                             <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-1 pl-2 border-l-2 border-gray-100 dark:border-gray-800">
                               <span className="text-gray-400 dark:text-gray-500 italic text-[10px]">by</span>
                               {log.actor.image ? (
                                 <img 
                                   src={log.actor.image} 
                                   alt={log.actor.name} 
                                   className="w-4 h-4 rounded-full object-cover" 
                                 />
                               ) : (
                                 <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                                   {log.actor.name.charAt(0)}
                                 </div>
                               )}
                               <span className="font-medium text-gray-700 dark:text-gray-300">{log.actor.name}</span>
                               <span className="text-gray-300 dark:text-gray-600">•</span>
                               <span className="text-gray-500 dark:text-gray-400 text-[10px]">{log.actor.role}</span>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   ))}
                   {logs.filter(log => logFilter === 'all' || log.type === logFilter).length === 0 && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p>No logs found for this filter.</p>
                      </div>
                   )}
                 </div>
               ) : (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                   <div className="mb-4 flex justify-center">
                     <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <Clock className="w-8 h-8 text-gray-400" />
                     </div>
                   </div>
                   <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No activity yet</h3>
                   <p>Activity logs will appear here once the branch starts operating.</p>
                 </div>
               )}
             </CompactCard>
          </motion.div>
        )}

        {activeTab === 'qrcode' && (
          <motion.div
            key="qrcode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
             <div className="md:col-span-2 lg:col-span-1">
                <CompactCard>
                    <div className="flex flex-col items-center justify-center p-6 space-y-6 bg-white dark:bg-gray-900 rounded-xl" id="printable-qr-card">
                       {/* 1. Header with Branding */}
                       <div className="w-full flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-600/20">
                                <Armchair className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">BookMyLib</h2>
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium tracking-wide uppercase">Smart Library</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{branch.name}</h3>
                            <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                <span>{branch.city || 'Branch'}</span>
                            </div>
                         </div>
                       </div>
    
                       {/* 2. Main QR Section */}
                       <div className="flex flex-col items-center space-y-5 py-2">
                         <div className="relative group">
                            <div className="absolute -inset-1.5 bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-75 blur transition duration-1000 group-hover:duration-200 group-hover:opacity-100"></div>
                            <div className="relative p-6 bg-white rounded-xl shadow-xl">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="Branch QR" className="w-64 h-64 object-contain" />
                                ) : (
                                    <div className="w-64 h-64 flex items-center justify-center bg-gray-50 text-gray-400">
                                        <QrCodeIcon className="w-16 h-16" />
                                    </div>
                                )}
                            </div>
                         </div>
                         <div className="flex items-center gap-2 text-sm font-bold text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-5 py-2 rounded-full border border-purple-100 dark:border-purple-800">
                            <Scan className="w-4 h-4" />
                            <span>Scan with Phone Camera</span>
                         </div>
                       </div>
    
                       {/* 3. Dual Instruction Section */}
                       <div className="grid grid-cols-2 gap-4 w-full">
                          {/* New Users */}
                          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-transparent border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl text-center space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100/50 dark:bg-blue-800/20 rounded-bl-full -mr-8 -mt-8"></div>
                            <div className="mx-auto w-12 h-12 bg-white dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-50 dark:border-blue-800">
                                <Search className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">New Visitor?</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-400 leading-snug">
                                    View photos, amenities & book seats instantly.
                                </p>
                            </div>
                          </div>
                          
                          {/* Existing Students */}
                          <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-transparent border border-green-100 dark:border-green-900/50 p-4 rounded-2xl text-center space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
                             <div className="absolute top-0 right-0 w-16 h-16 bg-green-100/50 dark:bg-green-800/20 rounded-bl-full -mr-8 -mt-8"></div>
                             <div className="mx-auto w-12 h-12 bg-white dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 shadow-sm border border-green-50 dark:border-green-800">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-green-900 dark:text-green-300 text-sm mb-1">Member?</h4>
                                <p className="text-xs text-green-700 dark:text-green-400 leading-snug">
                                    Mark attendance (Check-in/out) automatically.
                                </p>
                            </div>
                          </div>
                       </div>
    
                       {/* 4. Footer Details */}
                       <div className="w-full pt-5 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-gray-600 dark:text-gray-400">
                          {branch.phone && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium">{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                 <Mail className="w-3.5 h-3.5 text-gray-400" />
                                 <span className="truncate font-medium">{branch.email}</span>
                            </div>
                          )}
                          {(branch.owner?.name || branch.managerName) && (
                            <div className="col-span-2 flex flex-wrap gap-4 px-2">
                                {branch.owner?.name && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-400 font-medium uppercase text-[10px]">Owner</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{branch.owner.name}</span>
                                    </div>
                                )}
                                {branch.managerName && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-400 font-medium uppercase text-[10px]">Manager</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{branch.managerName}</span>
                                    </div>
                                )}
                            </div>
                          )}
                       </div>

                       {/* 5. Powered By Footer */}
                       <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Powered by BookMyLib</p>
                       </div>
                    </div>
    
                    {/* Actions below card */}
                    <div className="mt-6 flex gap-3">
                         <AnimatedButton 
                            variant="primary" 
                            className="flex-1"
                            onClick={handleGenerateQR}
                            disabled={isGeneratingQr}
                         >
                            {isGeneratingQr ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {branch?.qrCode ? 'Regenerate' : 'Generate'}
                         </AnimatedButton>
                         
                         {branch?.qrCode && (
                            <AnimatedButton 
                                variant="outline" 
                                onClick={handlePrintQR}
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Save & Print
                            </AnimatedButton>
                         )}
                    </div>
                </CompactCard>
             </div>
 
             <CompactCard>
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Instructions</h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 font-bold">1</div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Generate & Print</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate a unique QR code for this branch and print it out. Place it at the entrance or reception desk.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 font-bold">2</div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Student Scanning</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Students can use their mobile app to scan this QR code upon entry and exit.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 font-bold">3</div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Automatic Tracking</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Attendance is automatically recorded. Students must have an active subscription to check in.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                        <div className="flex gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                Regenerating the QR code will invalidate the previous one. Ensure you replace the printed codes immediately.
                            </p>
                        </div>
                    </div>
                </div>
             </CompactCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
