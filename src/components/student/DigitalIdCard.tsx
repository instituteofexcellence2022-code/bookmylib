'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { motion } from 'framer-motion'
import { Shield, User, Download, Share2, CheckCircle, BadgeCheck, Mail, Phone } from 'lucide-react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import { cn, formatSeatNumber } from '@/lib/utils'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface DigitalIdCardProps {
    student: {
        id: string
        name: string
        email: string
        image: string | null
        phone: string
        govtIdStatus?: string
    }
    activeSubscription?: {
        plan: {
            name: string
        }
        branch: {
            name: string
        }
        seat?: {
            number: number
            section: string
        }
        startDate: string
        endDate: string
    }
}

export function DigitalIdCard({ student, activeSubscription }: DigitalIdCardProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
    // const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Construct QR Data Payload
        const qrData = {
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            ...(activeSubscription ? {
                plan: activeSubscription.plan.name,
                branch: activeSubscription.branch.name,
                seat: activeSubscription.seat ? formatSeatNumber(activeSubscription.seat.number) : 'General',
                validUntil: format(new Date(activeSubscription.endDate), 'yyyy-MM-dd')
            } : {
                status: 'No Active Subscription'
            })
        }

        // Generate QR Code with Full Details
        QRCode.toDataURL(JSON.stringify(qrData), {
            width: 200,
            margin: 1,
            color: {
                dark: '#1e293b', // Slate-800
                light: '#ffffff'
            }
        }).then(url => {
            setQrCodeUrl(url)
        }).catch(err => {
            console.error('Error generating QR code', err)
        })
    }, [student, activeSubscription])

    const generatePDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [85.6, 54] // Standard ID card size (CR80)
        })

        // Background
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, 85.6, 54, 'F')
        
        // Header
        doc.setFillColor(37, 99, 235) // Blue-600
        doc.rect(0, 0, 85.6, 12, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('LIBRARY CARD', 42.8, 8, { align: 'center' })

        // Content
        doc.setTextColor(0, 0, 0)
        
        // Name
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(student.name, 28, 20)
        
        // ID
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`ID: ${student.id.slice(-8).toUpperCase()}`, 28, 23)

        // Details
        doc.setFontSize(7)
        doc.setTextColor(0, 0, 0)
        
        if (activeSubscription) {
            doc.text(`Plan: ${activeSubscription.plan.name}`, 28, 28)
            doc.text(`Branch: ${activeSubscription.branch.name}`, 28, 32)
            if (activeSubscription.seat) {
                doc.text(`Seat: ${formatSeatNumber(activeSubscription.seat.number)}`, 28, 36)
            }
            doc.text(`Valid: ${format(new Date(activeSubscription.endDate), 'MMM dd, yyyy')}`, 28, 40)
        } else {
            doc.setTextColor(220, 38, 38)
            doc.text('No Active Subscription', 28, 30)
        }

        // QR Code
        if (qrCodeUrl) {
            doc.addImage(qrCodeUrl, 'PNG', 2, 14, 24, 24)
        }

        // Footer
        doc.setFontSize(5)
        doc.setTextColor(150, 150, 150)
        doc.text('This is a digital identity card.', 42.8, 50, { align: 'center' })

        return doc
    }

    const handleDownload = () => {
        try {
            const doc = generatePDF()
            doc.save(`${student.name.replace(/\s+/g, '_')}_ID.pdf`)
            toast.success('ID Card downloaded')
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Failed to download ID card')
        }
    }

    const handleShare = async () => {
        try {
            const doc = generatePDF()
            const pdfBlob = doc.output('blob')
            const file = new File([pdfBlob], `${student.name.replace(/\s+/g, '_')}_ID.pdf`, { type: 'application/pdf' })

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Library Digital ID',
                    text: `Digital ID for ${student.name}`
                })
                toast.success('Shared successfully')
            } else {
                toast.error('Sharing files is not supported on this device')
            }
        } catch (error) {
            console.error('Share error:', error)
            // Don't show error if user cancelled share
            if ((error as Error).name !== 'AbortError') {
                toast.error('Failed to share ID card')
            }
        }
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
        >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                {/* ID Card Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-4 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-20 transform -skew-x-12 translate-x-1/2" />
                    
                    <div className="flex items-center gap-2 relative z-10">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold tracking-wide text-sm uppercase">Official Student ID</span>
                    </div>
                    <div className="text-xs font-mono opacity-80 relative z-10 bg-white/10 px-2 py-0.5 rounded">
                        LIB-{student.id.slice(-6).toUpperCase()}
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-5 relative">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                        <Shield size={200} />
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                        {/* 1st Half: Profile & Contact */}
                        <div className="flex flex-row items-center gap-4 sm:gap-6">
                            {/* Left: Photo */}
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                    {student.image ? (
                                        <Image 
                                            src={student.image} 
                                            alt={student.name} 
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                    )}
                                </div>
                                {student.govtIdStatus === 'verified' && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" title="Verified Identity">
                                        <CheckCircle size={14} />
                                    </div>
                                )}
                            </div>

                            {/* Right: Name, Email, Phone */}
                            <div className="flex-1 min-w-0 text-left">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-1.5">
                                    {student.name}
                                    {student.govtIdStatus === 'verified' && (
                                        <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="currentColor" stroke="white" />
                                    )}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.email}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <p className="text-xs text-gray-400">{student.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

                        {/* 2nd Half: QR & Other Details */}
                        <div className="flex flex-row gap-4 sm:gap-6">
                            {/* Left: QR Code */}
                            <div className="shrink-0 flex items-start">
                                {qrCodeUrl && (
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                                        <Image src={qrCodeUrl} alt="Student QR" width={80} height={80} className="w-20 h-20 sm:w-24 sm:h-24 mix-blend-multiply" />
                                    </div>
                                )}
                            </div>

                            {/* Right: Subscription Details */}
                            <div className="flex-1 min-w-0 space-y-3 pt-1">
                                {activeSubscription ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Current Plan</p>
                                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
                                                    {activeSubscription.plan.name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Seat Number</p>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {activeSubscription.seat ? formatSeatNumber(activeSubscription.seat.number) : 'General'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Branch</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {activeSubscription.branch.name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Valid Until</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {format(new Date(activeSubscription.endDate), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center font-medium border border-red-100 dark:border-red-900/30">
                                        No Active Subscription
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold pl-2">
                        Library Access Card
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-600 transition-colors shadow-sm"
                        >
                            <Share2 size={14} />
                            Share
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-600 transition-colors shadow-sm"
                        >
                            <Download size={14} />
                            Save PDF
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
