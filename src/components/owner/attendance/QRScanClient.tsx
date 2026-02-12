'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CheckCircle, AlertCircle, Loader2, RefreshCw, Volume2, VolumeX, LogOut, Zap, ZapOff } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { verifyStudentQR } from '@/actions/owner/attendance'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'sonner'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { SCANNER_CONFIG } from '@/lib/scanner'
import { useBackoff } from '@/hooks/useBackoff'

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
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(false)
  const backoff = useBackoff()

  // Sound feedback
  const playBeep = useCallback(() => {
    if (!soundEnabled) return
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass()
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

  const fetchBranches = useCallback(async () => {
    try {
        const result = await getOwnerBranches()
        if (result.success && result.data) {
            const data = result.data
            setBranches(data)
            if (data.length > 0 && !selectedBranchId) {
                setSelectedBranchId(data[0].id)
            }
        }
    } catch (error) {
        console.error('Failed to fetch branches', error)
    }
  }, [selectedBranchId])

  useEffect(() => {
    fetchBranches()
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
  }, [fetchBranches])

  const startScannerWithId = async (cameraId: string) => {
    if (!selectedBranchId) {
        toast.error('Please select a branch first')
        return
    }
    
    setScanning(true)
    setResult(null)
    setError(null)
    backoff.reset()

    // Wait for DOM
    setTimeout(async () => {
        try {
            const element = document.getElementById('reader-owner')
            if (!element) return

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader-owner")
            }

            if (!scannerRef.current.isScanning) {
                 await scannerRef.current.start(
                    cameraId, 
                    SCANNER_CONFIG,
                    (decodedText) => handleScan(decodedText),
                    () => {
                        // ignore
                    }
                )

                // Check capabilities
                try {
                    const capabilities = scannerRef.current.getRunningTrackCameraCapabilities() as any
                    setHasTorch(!!capabilities.torch)
                } catch (e) {
                    console.warn("Could not get camera capabilities", e)
                }
            }
        } catch (err) {
            console.error("Scanner init error", err)
            setError("Failed to start camera")
            setScanning(false)
        }
    }, 100)
  }

  const startScanner = () => {
    if (currentCameraId) {
      startScannerWithId(currentCameraId)
    } else {
      setError("No camera available")
    }
  }

  const toggleTorch = async () => {
    if (!scannerRef.current) return
    try {
        await scannerRef.current.applyVideoConstraints({
            advanced: [{ torch: !torchEnabled }] as any
        })
        setTorchEnabled(!torchEnabled)
    } catch (err) {
        console.error("Torch toggle failed", err)
        toast.error("Failed to toggle flashlight")
    }
  }

  const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(() => {})
      }
      setScanning(false)
  }

  const switchCamera = async () => {
    if (cameras.length <= 1) return
    
    const currentIndex = cameras.findIndex(c => c.id === currentCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCameraId = cameras[nextIndex].id
    
    setCurrentCameraId(nextCameraId)
    
    if (scanning && scannerRef.current) {
      await stopScanner()
      const d = backoff.nextDelay()
      setTimeout(() => {
        startScannerWithId(nextCameraId)
      }, d)
    }
  }

  const handleScan = async (studentId: string) => {
      if (processing || !mountedRef.current) return
      
      // Play sound and vibrate immediately
      playBeep()
      vibrate()

      setProcessing(true)
      
      // Stop scanning temporarily
      await stopScanner()

      try {
          const res = await verifyStudentQR(studentId, selectedBranchId)
          if (res.success) {
              backoff.reset()
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
      const d = backoff.nextDelay()
      setTimeout(() => {
        startScanner()
      }, d)
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
                
                <div className="flex gap-2">
                    {hasTorch && scanning && (
                        <button
                            onClick={toggleTorch}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                            title="Toggle Flashlight"
                        >
                            {torchEnabled ? <ZapOff size={20} className="text-yellow-500" /> : <Zap size={20} />}
                        </button>
                    )}
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                        title={soundEnabled ? "Mute" : "Unmute"}
                    >
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    
                    {cameras.length > 1 && (
                        <button
                            onClick={switchCamera}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                            title="Switch Camera"
                        >
                            <RefreshCw size={20} />
                        </button>
                    )}

                    {scanning && (
                        <button 
                            onClick={stopScanner}
                            className="text-red-500 hover:text-red-600 text-sm font-medium ml-2"
                        >
                            Stop Camera
                        </button>
                    )}
                </div>
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
                    <div className={`flex flex-col items-center text-center p-6 rounded-xl border ${
                        result.type === 'Check-in'
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20'
                        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'
                    }`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                            result.type === 'Check-in'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}>
                            {result.type === 'Check-in' 
                                ? <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                                : <LogOut size={32} className="text-amber-600 dark:text-amber-400" />
                            }
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
