'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { QrCode } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { getStaffBranchInfo } from '@/actions/staff/attendance'
import QRCode from 'qrcode'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

interface BranchInfo {
    id: string
    name: string
    qrCode?: string | null
}

export function StaffQRViewClient() {
    const [branch, setBranch] = useState<BranchInfo | null>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

    const fetchBranch = useCallback(async () => {
        try {
            const data = await getStaffBranchInfo()
            if (data) {
                setBranch(data)
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        fetchBranch()
    }, [fetchBranch])

    const generateQRImage = useCallback(async (code: string, branchId: string) => {
        try {
            const data = JSON.stringify({ type: 'check-in', branchId: branchId, code })
            const url = await QRCode.toDataURL(data, { width: 300, margin: 2 })
            setQrDataUrl(url)
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        if (branch?.qrCode) {
            generateQRImage(branch.qrCode, branch.id)
        } else {
            setQrDataUrl(null)
        }
    }, [branch, generateQRImage])

    const handlePrint = () => {
        if (!qrDataUrl || !branch) return
        
        const printWindow = window.open('', '', 'width=600,height=600')
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print QR Code - ${branch.name}</title>
                        <style>
                            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                            .container { text-align: center; border: 2px solid #000; padding: 40px; border-radius: 20px; }
                            h1 { margin-bottom: 10px; font-size: 24px; }
                            p { color: #666; margin-bottom: 30px; }
                            img { max-width: 100%; height: auto; }
                            .footer { margin-top: 20px; font-size: 12px; color: #999; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Scan to Check-In</h1>
                            <p>${branch.name}</p>
                            <img src="${qrDataUrl}" alt="QR Code" />
                            <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
                        </div>
                        <script>
                            window.onload = function() { window.print(); window.close(); }
                        </script>
                    </body>
                </html>
            `)
            printWindow.document.close()
        }
    }

    const handleDownload = () => {
        if (!qrDataUrl || !branch) return
        const link = document.createElement('a')
        link.download = `qrcode-${branch.id}.png`
        link.href = qrDataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (!branch) return null

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                <AnimatedCard>
                    <h3 className="text-lg font-medium mb-4">Branch QR Code</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 mb-4">
                            This is the unique QR code for <strong>{branch.name}</strong>. Students can scan this code to mark their attendance.
                        </p>
                    </div>
                </AnimatedCard>

                {qrDataUrl && (
                    <AnimatedCard>
                        <h3 className="text-lg font-medium mb-4">Actions</h3>
                        <div className="space-y-3">
                            <AnimatedButton 
                                onClick={handlePrint}
                                variant="outline"
                                className="w-full justify-center"
                                icon="print"
                            >
                                Print QR Poster
                            </AnimatedButton>
                            <AnimatedButton 
                                onClick={handleDownload}
                                variant="outline"
                                className="w-full justify-center"
                                icon="download"
                            >
                                Download Image
                            </AnimatedButton>
                        </div>
                    </AnimatedCard>
                )}
            </div>

            <div className="md:col-span-2">
                <AnimatedCard className="h-full flex flex-col items-center justify-center min-h-[400px]">
                    {qrDataUrl ? (
                        <div className="text-center space-y-6">
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrDataUrl} alt="Branch QR Code" className="w-64 h-64 md:w-80 md:h-80" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {branch.name}
                                </h3>
                                <p className="text-sm text-gray-500">Scan to mark attendance</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 max-w-sm mx-auto">
                            <div className="bg-gray-100 dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                                <QrCode size={40} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No QR Code Available</h3>
                            <p className="text-sm">Please ask the library owner to generate a QR code for this branch.</p>
                        </div>
                    )}
                </AnimatedCard>
            </div>
        </div>
    )
}
