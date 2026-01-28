'use client'

import React, { useState } from 'react'
import { QrCode, ClipboardList, BarChart3, ScanLine } from 'lucide-react'
import { AttendanceLogsClient } from '@/components/owner/attendance/AttendanceLogsClient'
import { QRGenerationClient } from '@/components/owner/attendance/QRGenerationClient'
import { AttendanceAnalyticsClient } from '@/components/owner/attendance/AttendanceAnalyticsClient'
import { QRScanClient } from '@/components/owner/attendance/QRScanClient'

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'qr' | 'scan'>('logs')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage QR codes and monitor attendance records.</p>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <ClipboardList size={16} />
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <QrCode size={16} />
            QR Generate
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'scan'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <ScanLine size={16} />
            QR Scan
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'logs' && <AttendanceLogsClient />}
        {activeTab === 'analytics' && <AttendanceAnalyticsClient />}
        {activeTab === 'qr' && <QRGenerationClient />}
        {activeTab === 'scan' && <QRScanClient />}
      </div>
    </div>
  )
}
