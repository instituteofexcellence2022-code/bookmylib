'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, X, RefreshCw, CheckCircle, AlertCircle, Loader2, Volume2, VolumeX, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Html5Qrcode } from 'html5-qrcode'
import { markAttendance, getStudentAttendanceStatus } from '@/actions/attendance'
import { toast } from 'sonner'
import { SCANNER_CONFIG } from '@/lib/scanner'

export default function ScanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQrCode = searchParams.get('qr_code')

  const [scanning, setScanning] = useState(true)
  const [result, setResult] = useState<{ type: string; branchName: string; timestamp: Date; duration?: number; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentStatus, setCurrentStatus] = useState<'loading' | 'checked-in' | 'checked-out'>('loading')

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(false)

  // Fetch current status on mount
  useEffect(() => {
      getStudentAttendanceStatus().then(res => {
          if (res.success) {
              setCurrentStatus(res.status as any)
          }
      })

      // Handle initial QR code if present
      if (initialQrCode) {
        handleScan(initialQrCode)
      }
  }, [initialQrCode])

  // Sound feedback
  const playBeep = useCallback(() => {
    if (!soundEnabled) return
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (e) {
      console.error("Audio play failed", e)
    }
  }, [soundEnabled])

  // Vibration feedback
  const vibrate = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    
    // Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices)
        // Prefer back camera
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
        setCurrentCameraId(backCamera.id)
      }
    }).catch(err => {
      console.error("Error getting cameras", err)
    })

    return () => {
        mountedRef.current = false
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => console.error("Error stopping scanner cleanup", err))
        }
    }
  }, [])

  const startScannerWithId = async (cameraId: string) => {
    if (!scanning || processing || result || error) return
    
    try {
        const element = document.getElementById('reader')
        if (!element) return

        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("reader")
        }

        if (!scannerRef.current.isScanning) {
                await scannerRef.current.start(
                cameraId, 
                SCANNER_CONFIG,
                (decodedText) => handleScan(decodedText),
                (errorMessage) => {
                    // ignore
                }
            )
        }
    } catch (err) {
        console.error("Scanner init error", err)
        setError("Failed to start camera. Please ensure camera permissions are granted.")
    }
  }

  useEffect(() => {
    if (currentCameraId && scanning && !processing && !result && !error) {
        const timer = setTimeout(() => startScannerWithId(currentCameraId), 500)
        return () => clearTimeout(timer)
    }
  }, [currentCameraId, scanning, processing, result, error])

  const switchCamera = async () => {
    if (cameras.length <= 1) return
    
    const currentIndex = cameras.findIndex(c => c.id === currentCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCameraId = cameras[nextIndex].id
    
    setCurrentCameraId(nextCameraId)
    
    if (scanning && scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop()
      setTimeout(() => {
        startScannerWithId(nextCameraId)
      }, 200)
    }
  }

  const handleScan = async (qrCode: string) => {
      if (processing || !mountedRef.current) return
      
      // Play sound and vibrate
      playBeep()
      vibrate()

      setProcessing(true)
      
      // Stop scanning
      if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(e => console.error(e))
      }

      // Extract token from URL if present
      let payload = qrCode
      try {
        if (qrCode.startsWith('http')) {
            const url = new URL(qrCode)
            const token = url.searchParams.get('qr_code')
            if (token) payload = token
        }
      } catch (e) {
        // Not a valid URL, treat as raw code
      }

      try {
          const res = await markAttendance(payload)
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
        <span className="text-white font-medium">
            {currentStatus === 'checked-in' ? 'Scan to Check Out' : currentStatus === 'checked-out' ? 'Scan to Check In' : 'Scan QR Code'}
        </span>
        <div className="flex gap-2">
            <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
                title={soundEnabled ? "Mute" : "Unmute"}
            >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            {cameras.length > 1 && (
                <button
                    onClick={switchCamera}
                    className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
                    title="Switch Camera"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            )}
        </div>
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
                    {currentStatus === 'checked-in' ? 'Align QR code to Check Out' : currentStatus === 'checked-out' ? 'Align QR code to Check In' : 'Align QR code within the frame'}
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
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                result.type === 'Check-in' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            }`}>
              {result.type === 'Check-in' ? <CheckCircle className="w-10 h-10" /> : <LogOut className="w-10 h-10" />}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{result.type} Successful!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                {result.message ? (
                   <span className="block text-amber-600 dark:text-amber-500 mb-1 font-medium">{result.message}</span>
                ) : null}
                You have successfully {result.type === 'Check-in' ? 'checked in' : 'checked out'} at <span className="font-semibold text-gray-900 dark:text-white">{result.branchName}</span>
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