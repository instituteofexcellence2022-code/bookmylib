'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { QrCode } from 'lucide-react'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { getOwnerBranches, generateBranchQR } from '@/actions/branch'
import QRCode from 'qrcode'
import { toast } from 'react-hot-toast'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

interface Branch {
    id: string
    name: string
    qrCode?: string | null
}

export function QRGenerationClient() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string>('')
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const [generating, setGenerating] = useState(false)

    const fetchBranches = useCallback(async () => {
        try {
            const data = await getOwnerBranches()
            setBranches(data)
            if (data.length > 0 && !selectedBranchId) {
                setSelectedBranchId(data[0].id)
            }
        } catch {
            // ignore
        }
    }, [selectedBranchId])

    useEffect(() => {
        fetchBranches()
    }, [fetchBranches])

    const generateQRImage = useCallback(async (code: string) => {
        try {
            // Enhanced QR Code Standard: Use Full URL for multi-purpose scanning
            // Matches StaffQRViewClient and BranchDetailsPage logic
            const baseUrl = window.location.origin
            const qrPayload = `${baseUrl}/discover/${selectedBranchId}?qr_code=${code}`

            const url = await QRCode.toDataURL(qrPayload, { 
                width: 600, 
                margin: 2,
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            })
            setQrDataUrl(url)
        } catch {
            // ignore
        }
    }, [selectedBranchId])

    useEffect(() => {
        if (selectedBranchId && branches.length > 0) {
            const branch = branches.find(b => b.id === selectedBranchId)
            if (branch?.qrCode) {
                generateQRImage(branch.qrCode)
            } else {
                setQrDataUrl(null)
            }
        }
    }, [selectedBranchId, branches, generateQRImage])

    const handleGenerate = async () => {
        if (!selectedBranchId) return
        setGenerating(true)
        try {
            const result = await generateBranchQR(selectedBranchId)
            if (result.success && result.qrCode) {
                toast.success('New QR Code generated')
                // Update local state
                const updatedBranches = branches.map(b => 
                    b.id === selectedBranchId ? { ...b, qrCode: result.qrCode } : b
                )
                setBranches(updatedBranches)
                generateQRImage(result.qrCode)
            } else {
                toast.error('Failed to generate QR code')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setGenerating(false)
        }
    }

    const handlePrint = () => {
        if (!qrDataUrl) return
        
        const printWindow = window.open('', '', 'width=600,height=600')
        if (printWindow) {
            const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'Library Branch'
            
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print QR Code - ${branchName}</title>
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
                            <p>${branchName}</p>
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
        if (!qrDataUrl) return
        const link = document.createElement('a')
        link.download = `qrcode-${selectedBranchId}.png`
        link.href = qrDataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                <AnimatedCard>
                    <h3 className="text-lg font-medium mb-4">Settings</h3>
                    <div className="space-y-4">
                        <FormSelect 
                            label="Select Branch"
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            options={branches.map(b => ({ label: b.name, value: b.id }))}
                        />
                        
                        <div className="pt-2">
                            <p className="text-sm text-gray-500 mb-4">
                                Generate a unique QR code for this branch. Students can scan this code to mark their attendance.
                            </p>
                            <AnimatedButton 
                                onClick={handleGenerate}
                                isLoading={generating}
                                className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white"
                                icon="refresh"
                            >
                                {qrDataUrl ? 'Regenerate QR Code' : 'Generate QR Code'}
                            </AnimatedButton>
                        </div>
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
                                    {branches.find(b => b.id === selectedBranchId)?.name}
                                </h3>
                                <p className="text-sm text-gray-500">Scan to mark attendance</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 max-w-sm mx-auto">
                            <div className="bg-gray-100 dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                                <QrCode size={40} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No QR Code Generated</h3>
                            <p className="text-sm">Select a branch and click &quot;Generate QR Code&quot; to get started.</p>
                        </div>
                    )}
                </AnimatedCard>
            </div>
        </div>
    )
}
