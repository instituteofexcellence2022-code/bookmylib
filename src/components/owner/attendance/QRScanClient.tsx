'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { verifyStudentQR } from '@/actions/owner/attendance'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'sonner'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

interface Branch {
  id: string
  name: string
}

export function QRScanClient() {
  const [scanning, setScanning] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [result, setResult] = useState<{ type: string; studentName: string; timestamp: Date; duration?: number; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(false)

  const fetchBranches = useCallback(async () => {
    try {
        const data = await getOwnerBranches()
        setBranches(data)
        if (data.length > 0 && !selectedBranchId) {
            setSelectedBranchId(data[0].id)
        }
    } catch (error) {
        console.error('Failed to fetch branches', error)
    }
  }, [selectedBranchId])

  useEffect(() => {
    fetchBranches()
    mountedRef.current = true
    return () => {
        mountedRef.current = false
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => console.error("Error stopping scanner cleanup", err))
        }
    }
  }, [fetchBranches])

  const startScanner = async () => {
    if (!selectedBranchId) {
        toast.error('Please select a branch first')
        return
    }
    
    setScanning(true)
    setResult(null)
    setError(null)

    // Wait for DOM
    setTimeout(async () => {
        try {
            const element = document.getElementById('reader-owner')
            if (!element) return

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader-owner")
            }

            const devices = await Html5Qrcode.getCameras()
            if (devices && devices.length) {
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
                
                if (!scannerRef.current.isScanning) {
                     await scannerRef.current.start(
                        backCamera.id, 
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        (decodedText) => {
                            handleScan(decodedText)
                        },
                        () => {
                            // ignore
                        }
                    )
                }
            } else {
                setError("No camera found")
            }
        } catch (err) {
            console.error("Scanner init error", err)
            setError("Failed to start camera")
            setScanning(false)
        }
    }, 100)
  }

  const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(() => {})
      }
      setScanning(false)
  }

  const handleScan = async (studentId: string) => {
      if (processing || !mountedRef.current) return
      setProcessing(true)
      
      // Stop scanning temporarily
      await stopScanner()

      try {
          const res = await verifyStudentQR(studentId, selectedBranchId)
          if (res.success) {
              setResult({
                  type: res.type === 'check-in' ? 'Check-in' : 'Check-out',
                  studentName: res.studentName || 'Student',
                  timestamp: res.timestamp ? new Date(res.timestamp) : new Date(),
                  duration: res.type === 'check-out' ? res.duration : undefined,
                  message: res.type === 'check-in' ? 'Check-in Successful' : 'Check-out Successful'
              })
              toast.success(`${res.type === 'check-in' ? 'Check-in' : 'Check-out'} Successful`)
          } else {
              setError(res.error || 'Scan failed')
              toast.error(res.error || 'Scan failed')
          }
      } catch {
          setError('An unexpected error occurred')
          toast.error('An unexpected error occurred')
      } finally {
          setProcessing(false)
      }
  }

  const resetScan = () => {
      setResult(null)
      setError(null)
      startScanner()
  }

  return (
    <div className="space-y-6">
        {/* Branch Selection */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Branch</h3>
            <div className="max-w-md">
                <FormSelect
                    label="Current Branch"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    options={branches.map(b => ({ label: b.name, value: b.id }))}
                    disabled={scanning}
                />
            </div>
        </div>

        {/* Scanner Area */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Camera size={20} className="text-blue-500" />
                    Scan Student ID
                </h3>
                {scanning && (
                    <button 
                        onClick={stopScanner}
                        className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                        Stop Camera
                    </button>
                )}
            </div>

            {!scanning && !result && !error && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <Camera size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-6">Ready to scan student digital ID</p>
                    <AnimatedButton onClick={startScanner}>
                        Start Scanner
                    </AnimatedButton>
                </div>
            )}

            {/* Scanner Viewport */}
            <div className={`${scanning ? 'block' : 'hidden'} relative rounded-xl overflow-hidden bg-black max-w-md mx-auto`}>
                <div id="reader-owner" className="w-full"></div>
                {processing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <Loader2 className="animate-spin text-white" size={48} />
                    </div>
                )}
            </div>

            {/* Success Result */}
            {result && (
                <AnimatedCard>
                    <div className="flex flex-col items-center text-center p-6 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {result.type} Successful
                        </h3>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {result.studentName}
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            {result.timestamp.toLocaleTimeString()}
                            {result.duration && ` • Duration: ${Math.floor(result.duration / 60)}h ${result.duration % 60}m`}
                        </p>
                        <AnimatedButton onClick={resetScan} variant="outline">
                            Scan Next Student
                        </AnimatedButton>
                    </div>
                </AnimatedCard>
            )}

            {/* Error Result */}
            {error && (
                <AnimatedCard>
                    <div className="flex flex-col items-center text-center p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Scan Failed
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
                        <div className="flex gap-3">
                            <AnimatedButton onClick={() => setError(null)} variant="secondary">
                                Cancel
                            </AnimatedButton>
                            <AnimatedButton onClick={resetScan}>
                                Try Again
                            </AnimatedButton>
                        </div>
                    </div>
                </AnimatedCard>
            )}
        </div>
    </div>
  )
}
