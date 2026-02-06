'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CheckCircle, Loader2, ArrowLeft, AlertCircle, Volume2, VolumeX, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Html5Qrcode } from 'html5-qrcode'
import { markAttendance } from '@/actions/attendance'
import { toast } from 'sonner'
import { SCANNER_CONFIG } from '@/lib/scanner'

export default function ScanPage() {
  const searchParams = useSearchParams()
  const initialQrCode = searchParams.get('qr_code')

  const [scanning, setScanning] = useState(true)
  const [result, setResult] = useState<{ type: string; branchName: string; timestamp: Date; duration?: number; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = "reader"

  // Sound feedback
  const playBeep = useCallback(() => {
    if (!soundEnabled) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const vibrate = useCallback((pattern: number | number[] = 200) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  const handleScan = useCallback(async (qrCode: string) => {
      if (processing) return
      
      setProcessing(true)
      playBeep()
      vibrate(50) // Short vibration on detection

      // Stop scanning temporarily
      if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(console.error)
      }

      // Extract token from URL if present
      let payload = qrCode
      try {
        if (qrCode.startsWith('http')) {
            const url = new URL(qrCode)
            const token = url.searchParams.get('qr_code')
            if (token) payload = token
        }
      } catch {
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
              vibrate([100, 50, 100]) // Success pattern: short-pause-short
              setScanning(false)
          } else {
              setError(res.error || 'Failed to mark attendance')
              toast.error(res.error || 'Failed to mark attendance')
              vibrate([300]) // Error pattern: long vibration
              // Keep scanning state true to allow retry, but processing false
              // Actually, maybe we should show error screen and let user retry?
              // Let's show error state
              setScanning(false)
          }
      } catch {
          setError('System error. Please try again.')
          vibrate([300]) // Error pattern: long vibration
          setScanning(false)
      } finally {
          setProcessing(false)
      }
  }, [processing, playBeep, vibrate])

  // Fetch current status on mount
  useEffect(() => {
    // Handle initial QR code if present
    if (initialQrCode) {
      handleScan(initialQrCode)
    }
  }, [initialQrCode, handleScan])

  // Initialize cameras
  useEffect(() => {
    let mounted = true;

    const initCameras = async () => {
      try {
        // Check for permissions first
        try {
            await navigator.mediaDevices.getUserMedia({ video: true })
        } catch (err) {
            if (mounted) {
                setPermissionDenied(true)
                setError("Camera permission denied. Please enable camera access in your browser settings.")
                setInitializing(false)
                return
            }
        }

        const devices = await Html5Qrcode.getCameras()
        if (mounted) {
          if (devices && devices.length) {
            setCameras(devices)
            // Prefer back camera
            const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')) || devices[0]
            setCurrentCameraId(backCamera.id)
          } else {
            setError("No cameras found on this device.")
          }
          setInitializing(false)
        }
      } catch (err) {
        console.error("Error getting cameras", err)
        if (mounted) {
            setError("Failed to access camera info.")
            setInitializing(false)
        }
      }
    }

    initCameras()

    return () => {
      mounted = false
    }
  }, [])

  // Start/Stop scanner logic
  useEffect(() => {
    let ignore = false;

    const startScanner = async () => {
        if (!currentCameraId || !scanning || result || processing || permissionDenied || error) return

        try {
            // If instance exists but is not scanning, or if we need to recreate it
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(scannerContainerId)
            }

            if (scannerRef.current.isScanning) {
                 // Already scanning, do nothing or restart if camera changed (handled by dependency)
                 // For simplicity, we assume we stop before start if camera changes
                 return
            }
            
            await scannerRef.current.start(
                currentCameraId,
                SCANNER_CONFIG,
                (decodedText) => {
                    if (!ignore) handleScan(decodedText)
                },
                (errorMessage) => {
                    // ignore frame errors
                }
            )
        } catch (err) {
            console.error("Scanner start error", err)
            if (!ignore) {
                 // Only set error if we really can't start (sometimes it fails transiently)
                 // setError("Failed to start camera stream")
            }
        }
    }

    // Cleanup function
    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop()
            } catch (err) {
                console.error("Scanner stop error", err)
            }
        }
    }

    // If we have a camera and should be scanning, start it
    if (currentCameraId && scanning && !result && !processing && !permissionDenied && !error) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            if (!ignore) startScanner()
        }, 100)
    }

    return () => {
        ignore = true
        stopScanner()
    }
  }, [currentCameraId, scanning, result, processing, permissionDenied, error])


  const switchCamera = async () => {
    if (cameras.length <= 1) return
    
    // Stop current scanner first
    if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(console.error)
    }

    const currentIndex = cameras.findIndex(c => c.id === currentCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    setCurrentCameraId(cameras[nextIndex].id)
    // The useEffect will trigger restart
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setScanning(true)
    setProcessing(false)
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Link href="/student/home">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Scan QR Code</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Scanner Area */}
      <div className="relative overflow-hidden rounded-3xl bg-black aspect-square shadow-xl ring-4 ring-white/10">
        
        {/* Scanner Container */}
        <div id={scannerContainerId} className="w-full h-full" />

        {/* Overlays */}
        {initializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white z-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                <p className="text-sm text-zinc-400">Starting camera...</p>
            </div>
        )}

        {permissionDenied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white z-20 p-6 text-center">
                <Camera className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Camera Access Denied</h3>
                <p className="text-sm text-zinc-400 mb-6">Please enable camera access in your browser settings to use the scanner.</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="text-black bg-white hover:bg-zinc-200">
                    Retry
                </Button>
            </div>
        )}

        {!scanning && !permissionDenied && !initializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 backdrop-blur-sm z-20 p-6 text-center">
                {processing ? (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                        <p className="text-lg font-medium text-white">Processing...</p>
                    </>
                ) : result ? (
                    <>
                        <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 ring-4 ring-green-500/20">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{result.type}</h2>
                        <p className="text-zinc-400 mb-1">{result.branchName}</p>
                        <p className="text-sm text-zinc-500 mb-6">
                            {result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        
                        {result.message && (
                            <div className="bg-white/10 rounded-lg p-3 mb-6 w-full">
                                <p className="text-sm text-white">{result.message}</p>
                            </div>
                        )}

                        <Button onClick={handleReset} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl">
                            Scan Again
                        </Button>
                    </>
                ) : error ? (
                    <>
                        <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 ring-4 ring-red-500/20">
                            <AlertCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Scan Failed</h2>
                        <p className="text-sm text-zinc-400 mb-6">{error}</p>
                        <Button onClick={handleReset} className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl">
                            Try Again
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleReset} className="w-full bg-blue-600 hover:bg-blue-700">
                        Start Scanning
                    </Button>
                )}
            </div>
        )}

        {/* Scanning Overlay (only visible when scanning) */}
        {scanning && !initializing && !permissionDenied && (
            <>
                <div className="absolute inset-0 border-[40px] border-black/50 z-10 pointer-events-none">
                    <div className="w-full h-full border-2 border-blue-500/50 relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1" />
                    </div>
                </div>
                
                {/* Scanner Controls */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-20">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full h-12 w-12 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border-0"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                    >
                        {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </Button>
                    
                    {cameras.length > 1 && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full h-12 w-12 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border-0"
                            onClick={switchCamera}
                        >
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </>
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Align the QR code within the frame to check in or check out.
        </p>
      </div>
    </div>
  )
}
