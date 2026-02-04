'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Camera, CheckCircle, AlertCircle, Loader2, QrCode, ScanLine, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { markStaffSelfAttendance } from '@/actions/staff/attendance'
import { toast } from 'sonner'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { cn } from '@/lib/utils'

interface StaffSelfAttendanceScannerProps {
    isCheckedIn: boolean
}

export function StaffSelfAttendanceScanner({ isCheckedIn }: StaffSelfAttendanceScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ type: string; timestamp: Date; duration?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
        mountedRef.current = false
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => console.error("Error stopping scanner cleanup", err))
        }
    }
  }, [])

  const startScanner = async () => {
    setScanning(true)
    setResult(null)
    setError(null)

    // Wait for DOM
    setTimeout(async () => {
        try {
            const element = document.getElementById('reader-staff-self')
            if (!element) return

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader-staff-self")
            }

            const devices = await Html5Qrcode.getCameras()
            if (devices && devices.length) {
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
                
                if (!scannerRef.current.isScanning) {
                     await scannerRef.current.start(
                        backCamera.id, 
                        {
                            fps: 20,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0,
                            videoConstraints: {
                                width: { min: 640, ideal: 1280, max: 1920 },
                                height: { min: 480, ideal: 720, max: 1080 },
                                facingMode: "environment"
                            }
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

  const handleScan = async (qrContent: string) => {
      if (processing || !mountedRef.current) return
      setProcessing(true)
      
      // Stop scanning temporarily
      await stopScanner()

      try {
          const res = await markStaffSelfAttendance(qrContent)
          if (res.success) {
              setResult({
                  type: res.type === 'check-in' ? 'Check-in' : 'Check-out',
                  timestamp: res.timestamp ? new Date(res.timestamp) : new Date(),
                  duration: res.duration
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
      setScanning(false)
  }

  return (
    <div className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm",
        isCheckedIn 
            ? "bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 border-blue-100 dark:from-blue-950/20 dark:via-gray-800 dark:to-blue-900/10 dark:border-blue-900/30"
            : "bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 border-purple-100 dark:from-purple-950/20 dark:via-gray-800 dark:to-purple-900/10 dark:border-purple-900/30"
    )}>
        {/* Header Section */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm">
            <div>
                <h3 className={cn(
                    "text-lg font-bold flex items-center gap-2",
                    isCheckedIn ? "text-blue-700 dark:text-blue-400" : "text-purple-700 dark:text-purple-400"
                )}>
                    <ScanLine size={18} className={isCheckedIn ? "text-blue-500" : "text-purple-500"} />
                    {isCheckedIn ? 'Check Out Scanner' : 'Check In Scanner'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isCheckedIn ? 'End your shift securely' : 'Start your shift securely'}
                </p>
            </div>
            {scanning && (
                <button 
                    onClick={stopScanner}
                    className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors dark:hover:bg-red-900/20"
                    title="Stop Camera"
                >
                    <X size={18} />
                </button>
            )}
        </div>

        <div className="p-4">
            {!scanning && !result && !error && (
                <div className="flex flex-col items-center justify-center py-6">
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg transform transition-transform hover:scale-105 duration-300",
                        isCheckedIn 
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    )}>
                        <QrCode size={32} />
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-1 font-medium text-center">
                        {isCheckedIn ? 'Ready to clock out?' : 'Ready to start work?'}
                    </p>
                    <p className="text-sm text-gray-500 mb-6 text-center max-w-[260px]">
                        Scan the Branch QR code displayed at the front desk to {isCheckedIn ? 'end your shift' : 'begin your shift'}.
                    </p>

                    <AnimatedButton 
                        onClick={startScanner}
                        className={cn(
                            "min-w-[180px] shadow-lg hover:shadow-xl transition-shadow py-2",
                            isCheckedIn 
                                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                        )}
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        {isCheckedIn ? 'Scan to Check Out' : 'Scan to Check In'}
                    </AnimatedButton>
                </div>
            )}

            {/* Premium Scanner Viewport */}
            <div className={`${scanning ? 'block' : 'hidden'} relative overflow-hidden rounded-2xl bg-black max-w-sm mx-auto shadow-2xl ring-4 ring-black/5`}>
                <div id="reader-staff-self" className="w-full h-full min-h-[300px] object-cover"></div>
                
                {/* Overlay UI */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Scanner Frame Corners */}
                    <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-xl"></div>
                    <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-xl"></div>
                    <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-xl"></div>
                    <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-xl"></div>

                    {/* Animated Scan Line */}
                    <div className="absolute inset-x-0 top-0 h-1/2 border-b-2 border-red-500/80 bg-gradient-to-b from-transparent to-red-500/10 animate-[scan_2s_infinite_linear]"></div>

                    {/* Status Pill */}
                    <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <div className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                            {isCheckedIn ? 'Scanning for Check-out...' : 'Scanning for Check-in...'}
                        </div>
                    </div>
                </div>

                {processing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                        <Loader2 className="animate-spin text-white mb-3" size={48} />
                        <span className="text-white font-medium text-sm tracking-wide">Verifying QR Code...</span>
                    </div>
                )}
            </div>

            {/* Success Result */}
            {result && (
                <AnimatedCard>
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="relative mb-6">
                            <div className={cn(
                                "w-20 h-20 rounded-full flex items-center justify-center animate-[bounce_0.5s_ease-out]",
                                result.type === 'Check-in'
                                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                                <CheckCircle size={40} />
                            </div>
                            <div className={cn(
                                "absolute -inset-2 rounded-full opacity-20 animate-ping",
                                result.type === 'Check-in' ? "bg-green-500" : "bg-blue-500"
                            )}></div>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {result.type} Successful
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
                            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                                {result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {result.duration && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <span>{Math.floor(result.duration / 60)}h {result.duration % 60}m Shift</span>
                                </>
                            )}
                        </div>

                        <AnimatedButton 
                            onClick={resetScan} 
                            variant="outline"
                            className="min-w-[140px]"
                        >
                            Done
                        </AnimatedButton>
                    </div>
                </AnimatedCard>
            )}

            {/* Error Result */}
            {error && (
                <AnimatedCard>
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle size={40} className="text-red-500 dark:text-red-400" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Scan Failed
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-[280px] mx-auto">
                            {error}
                        </p>
                        
                        <div className="flex gap-3 w-full max-w-[300px] justify-center">
                            <AnimatedButton onClick={() => setError(null)} variant="secondary" className="flex-1">
                                Cancel
                            </AnimatedButton>
                            <AnimatedButton onClick={startScanner} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                                Try Again
                            </AnimatedButton>
                        </div>
                    </div>
                </AnimatedCard>
            )}
        </div>

        {/* CSS for Scan Animation */}
        <style jsx global>{`
            @keyframes scan {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100%); }
            }
        `}</style>
    </div>
  )
}
