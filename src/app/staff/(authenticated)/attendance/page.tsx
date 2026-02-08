'use client'

import React, { useState } from 'react'
import { ClipboardList, BarChart3, QrCode, ScanLine } from 'lucide-react'
import { StaffAttendanceLogsClient } from '@/components/staff/attendance/StaffAttendanceLogsClient'
import { StaffAttendanceAnalyticsClient } from '@/components/staff/attendance/StaffAttendanceAnalyticsClient'
import { StaffQRViewClient } from '@/components/staff/attendance/StaffQRViewClient'
import { StaffQRScanClient } from '@/components/staff/attendance/StaffQRScanClient'

export default function AttendancePage() {
    const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'qr' | 'scan'>('logs')

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance & Access</h1>
                
                {/* Tabs */}
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex self-start md:self-auto flex-wrap">
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'logs' 
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
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
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
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
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                        }`}
                    >
                        <QrCode size={16} />
                        Branch QR
                    </button>
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'scan' 
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                        }`}
                    >
                        <ScanLine size={16} />
                        QR Scan
                    </button>
                </div>
            </div>

            <div className="min-h-[500px]">
                {activeTab === 'logs' && <StaffAttendanceLogsClient />}
                {activeTab === 'analytics' && <StaffAttendanceAnalyticsClient />}
                {activeTab === 'qr' && <StaffQRViewClient />}
                {activeTab === 'scan' && <StaffQRScanClient />}
            </div>
        </div>
    )
}
