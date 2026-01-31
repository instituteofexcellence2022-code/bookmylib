'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Camera, X, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Html5Qrcode } from 'html5-qrcode'
import { markAttendance } from '@/actions/attendance'
import { toast } from 'sonner'

export default function ScanPage() {
  const router = useRouter()
  const [scanning, setScanning] = useState(true)
  const [result, setResult] = useState<{ type: string; branchName: string; timestamp: Date; duration?: number; message?: string } | null>(null)
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

  useEffect(() => {
    if (!scanning || processing || result || error) return

    const initScanner = async () => {
        try {
            // Check if element exists
            const element = document.getElementById('reader')
            if (!element) return

            // If already instance exists, use it or clear it
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader")
            }

            const devices = await Html5Qrcode.getCameras()
            if (devices && devices.length) {
                const cameraId = devices[0].id // Use back camera if possible, usually last one or filtered
                // Filter for back camera if multiple
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
                        (errorMessage) => {
                            // ignore
                        }
                    )
                }
            } else {
                setError("No camera found")
            }
        } catch (err) {
            console.error("Scanner init error", err)
            setError("Failed to start camera. Please ensure camera permissions are granted.")
        }
    }

    // Small delay to ensure render
    const timer = setTimeout(initScanner, 500)
    return () => clearTimeout(timer)
  }, [scanning, processing, result, error])

  const handleScan = async (qrCode: string) => {
      if (processing || !mountedRef.current) return
      setProcessing(true)
      
      // Stop scanning
      if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(e => console.error(e))
      }

      try {
          const res = await markAttendance(qrCode)
          if (res.success) {
              setResult({
                  type: res.type === 'check-in' ? 'Check-in' : 'Check-out',
                  branchName: res.branchName || 'Library',
                  timestamp: res.timestamp ? new Date(res.timestamp) : new Date(),
                  duration: res.duration,
                  message: res.message
              })
              toast.success(`${res.type === 'check-in' ? 'Check-in' : 'Check-out'} Successful`)
          } else {
              setError(res.error || 'Failed to mark attendance')
              toast.error(res.error || 'Failed to mark attendance')
          }
      } catch (err) {
          setError('System error. Please try again.')
      } finally {
          setProcessing(false)
          setScanning(false)
      }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setScanning(true)
    setProcessing(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-black rounded-xl overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/student/attendance" className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors">
          <X className="w-6 h-6" />
        </Link>
        <span className="text-white font-medium">Scan QR Code</span>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative bg-gray-900">
        
        {/* Scanner View */}
        {scanning && !result && !error && (
            <div className="w-full h-full relative flex items-center justify-center">
                 <div id="reader" className="w-full h-full object-cover"></div>
                 {/* Overlay */}
                 <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                        <div className="absolute inset-0 border-2 border-purple-500/50 rounded-lg animate-pulse" />
                        <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                 </div>
                 <p className="absolute bottom-24 text-white/90 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                    Align QR code within the frame
                 </p>
            </div>
        )}

        {/* Processing State */}
        {processing && (
            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                <p className="text-white font-medium">Verifying...</p>
            </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="flex flex-col items-center p-8 bg-white dark:bg-gray-900 rounded-2xl mx-4 animate-in zoom-in duration-300 max-w-sm w-full shadow-2xl">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{result.type} Successful!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                {result.message ? (
                   <span className="block text-amber-600 dark:text-amber-500 mb-1 font-medium">{result.message}</span>
                ) : null}
                You have successfully {result.type.toLowerCase()} at <span className="font-semibold text-gray-900 dark:text-white">{result.branchName}</span>
                {result.duration ? ` (Duration: ${Math.floor(result.duration / 60)}h ${result.duration % 60}m)` : ''}
            </p>
            <div className="w-full text-center mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Time</p>
                <p className="text-lg font-mono font-medium text-gray-900 dark:text-white">
                    {result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="flex space-x-3 w-full">
              <AnimatedButton 
                onClick={() => router.push('/student/attendance')}
                variant="secondary"
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Done
              </AnimatedButton>
              <AnimatedButton 
                onClick={handleReset}
                variant="primary"
                className="flex-1"
              >
                Scan Again
              </AnimatedButton>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center p-8 bg-white rounded-2xl mx-4 animate-in zoom-in duration-300 max-w-sm w-full">
             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Scan Failed</h3>
             <p className="text-gray-500 dark:text-gray-400 text-center mb-6">{error}</p>
             <AnimatedButton onClick={handleReset} variant="primary" className="w-full">
                Try Again
             </AnimatedButton>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
