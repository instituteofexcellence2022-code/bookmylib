'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, RefreshCw, User, CheckCircle, AlertTriangle, CreditCard, FileText, ArrowLeft, ArrowRight, ShieldCheck, LogIn, LogOut, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getStudentDetailsForScanner } from '@/actions/staff/students'
import { markStudentAttendance, markStaffSelfAttendance } from '@/actions/staff/attendance'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import Image from 'next/image'
import { format, differenceInCalendarDays } from 'date-fns'
import { formatSeatNumber } from '@/lib/utils'

export function ScannerClient({ initialCode }: { initialCode?: string }) {
    const router = useRouter()
    const [scanning, setScanning] = useState(true)
    const [studentData, setStudentData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
    const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const mountedRef = useRef(false)
    const initialProcessed = useRef(false)

    // Handle initial code
    useEffect(() => {
        if (initialCode && !initialProcessed.current) {
            initialProcessed.current = true
            handleScan(initialCode)
        }
    }, [initialCode])

    // Sound feedback
    const playBeep = useCallback(() => {
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
    }, [])

    useEffect(() => {
        mountedRef.current = true
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                setCameras(devices)
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
                setCurrentCameraId(backCamera.id)
            }
        }).catch(err => console.error("Error getting cameras", err))

        return () => {
            mountedRef.current = false
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error)
            }
        }
    }, [])

    const startScanner = async (cameraId: string) => {
        if (!scanning || loading || studentData) return

        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader")
            }

            if (!scannerRef.current.isScanning) {
                await scannerRef.current.start(
                    cameraId,
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
                    (decodedText) => handleScan(decodedText),
                    (errorMessage) => { /* ignore */ }
                )
            }
        } catch (err) {
            console.error("Scanner init error", err)
            setError("Failed to start camera")
        }
    }

    useEffect(() => {
        if (currentCameraId && scanning && !loading && !studentData) {
            const timer = setTimeout(() => startScanner(currentCameraId), 500)
            return () => clearTimeout(timer)
        }
    }, [currentCameraId, scanning, loading, studentData])

    const handleScan = async (decodedText: string) => {
        if (loading || !mountedRef.current) return

        // Play sound
        playBeep()
        if (navigator.vibrate) navigator.vibrate(200)

        setLoading(true)
        
        try {
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop()
            }
        } catch (e) {
            console.error(e)
        }

        try {
            // Parse JSON if possible
            let studentId = decodedText
            try {
                const data = JSON.parse(decodedText)
                if (data.id) studentId = data.id
            } catch (e) {
                // Check if URL and extract qr_code or use raw text
                if (decodedText.startsWith('http')) {
                    try {
                        const url = new URL(decodedText)
                        const token = url.searchParams.get('qr_code')
                        if (token) studentId = token
                    } catch (urlErr) {}
                }
            }

            // 1. Try to fetch student details
            const res = await getStudentDetailsForScanner(studentId)
            
            if (res.success) {
                setStudentData(res.data)
                setScanning(false)
                setLoading(false)
            } else {
                // 2. If student not found, try Staff Self Attendance (Branch QR)
                try {
                    // Use the parsed ID/Token which might be the Branch QR code
                    const attendanceRes = await markStaffSelfAttendance(studentId)
                    
                    if (attendanceRes.success) {
                        toast.success(attendanceRes.type === 'check-in' ? 'Staff Check-in Successful' : 'Staff Check-out Successful')
                        
                        // Restart scanner after short delay
                        setTimeout(() => {
                            setLoading(false)
                            setScanning(true)
                        }, 2000)
                        return
                    }
                } catch (e) {
                    // Ignore error and proceed to show student not found
                }

                toast.error(res.error || 'Student not found')
                setError(res.error || 'Student not found')
                // Wait a bit then restart scanner
                setTimeout(() => {
                    setError(null)
                    setLoading(false)
                    setScanning(true)
                }, 2000)
            }
        } catch (err) {
            console.error(err)
            setError('System error')
            setLoading(false)
        }
    }

    const handleReset = () => {
        setStudentData(null)
        setScanning(true)
        setError(null)
        setLoading(false)
    }

    const handleAttendance = async (type: 'check-in' | 'check-out') => {
        if (!studentData?.student?.id) return
        
        try {
            const res = await markStudentAttendance(studentData.student.id, type)
            if (res.success) {
                toast.success(`Successfully ${type === 'check-in' ? 'checked in' : 'checked out'}`)
                // Update local state
                const updatedRes = await getStudentDetailsForScanner(studentData.student.id)
                if (updatedRes.success) {
                    setStudentData(updatedRes.data)
                }
            } else {
                toast.error(res.error || 'Failed to mark attendance')
            }
        } catch (error) {
            toast.error('System error')
        }
    }

    const switchCamera = () => {
        if (cameras.length <= 1) return
        const currentIndex = cameras.findIndex(c => c.id === currentCameraId)
        const nextIndex = (currentIndex + 1) % cameras.length
        setCurrentCameraId(cameras[nextIndex].id)
        // Effect will trigger restart
    }

    if (studentData) {
        const { student, subscription, attendance, pendingPayment, lastPayment } = studentData
        const isCheckedIn = !!(attendance && !attendance.checkOut)
        const daysLeft = subscription ? differenceInCalendarDays(new Date(subscription.endDate), new Date()) : null
        const isExpired = typeof daysLeft === 'number' && daysLeft < 0

        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <AnimatedButton variant="outline" size="icon" onClick={handleReset}>
                        <ArrowLeft className="w-5 h-5" />
                    </AnimatedButton>
                    <h1 className="text-2xl font-bold">Student Details</h1>
                </div>

                <AnimatedCard>
                    <div className="flex items-start gap-4">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            {student.image ? (
                                <Image src={student.image} alt={student.name} fill className="object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold">{student.name}</h2>
                            <p className="text-gray-500">{student.email}</p>
                            <p className="text-gray-500">{student.phone}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscription?.status === 'active' ? 'bg-green-100 text-green-700' : subscription?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    {subscription?.status === 'active' ? 'Active Plan' : subscription?.status === 'pending' ? 'Pending Verification' : 'No Active Plan'}
                                </span>
                                {isCheckedIn && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        Checked In
                                    </span>
                                )}
                                {subscription && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {isExpired ? `Expired ${Math.abs(daysLeft!)}d ago` : `Expires in ${daysLeft}d`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </AnimatedCard>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <AnimatedButton 
                        onClick={() => handleAttendance('check-in')}
                        disabled={isCheckedIn || (!subscription && !pendingPayment) || (subscription?.status !== 'active' && subscription?.status !== 'pending')}
                        className={`h-auto flex-col p-4 gap-2 ${isCheckedIn ? 'opacity-50' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        <LogIn className="w-6 h-6" />
                        <span>Check In</span>
                    </AnimatedButton>

                    <AnimatedButton 
                        onClick={() => handleAttendance('check-out')}
                        disabled={!isCheckedIn}
                        className={`h-auto flex-col p-4 gap-2 ${!isCheckedIn ? 'opacity-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        <LogOut className="w-6 h-6" />
                        <span>Check Out</span>
                    </AnimatedButton>

                    <AnimatedButton 
                        variant="outline"
                        onClick={() => router.push(`/staff/verification?studentId=${student.id}`)}
                        className="h-auto flex-col p-4 gap-2 border-dashed relative overflow-hidden"
                        disabled={!pendingPayment}
                    >
                        {pendingPayment && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                        <span>Verify Payment</span>
                    </AnimatedButton>

                    <AnimatedButton 
                        variant="outline"
                        onClick={() => router.push(`/staff/finance?tab=accept&studentId=${student.id}`)}
                        className="h-auto flex-col p-4 gap-2 border-dashed"
                    >
                        <CreditCard className="w-6 h-6 text-emerald-600" />
                        <span>Accept Payment</span>
                    </AnimatedButton>

                    <AnimatedButton 
                        variant="outline"
                        onClick={() => router.push(`/staff/issues/new?studentId=${student.id}`)}
                        className="h-auto flex-col p-4 gap-2 border-dashed"
                    >
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <span>Report Issue</span>
                    </AnimatedButton>

                    <AnimatedButton 
                        variant="secondary"
                        onClick={() => router.push(`/staff/students/${student.id}`)}
                        className="col-span-2 flex items-center justify-center gap-2 py-3"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Full Profile
                    </AnimatedButton>
                </div>

                {/* Subscription Details */}
                {subscription && (
                    <AnimatedCard title="Current Subscription">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Plan</p>
                                <p className="font-medium">{subscription.plan.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Type</p>
                                <p className="font-medium capitalize">{subscription.plan.category || 'standard'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Branch</p>
                                <p className="font-medium">{subscription.branch.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Seat</p>
                                <p className="font-medium">{subscription.seat ? formatSeatNumber(subscription.seat.number) : 'General'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Start</p>
                                <p className="font-medium">{format(new Date(subscription.startDate), 'MMM dd, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">End</p>
                                <p className="font-medium">{format(new Date(subscription.endDate), 'MMM dd, yyyy')}</p>
                            </div>
                        </div>
                    </AnimatedCard>
                )}

                {(pendingPayment || lastPayment) && (
                    <AnimatedCard title="Payment Summary">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {pendingPayment && (
                                <div className="col-span-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30">
                                    <p className="text-yellow-700 dark:text-yellow-300 font-medium">Pending Payment</p>
                                    <p className="text-yellow-700 dark:text-yellow-300">₹{Number(pendingPayment.amount || 0).toFixed(2)} • {pendingPayment.method?.replace('_',' ') || 'offline'}</p>
                                </div>
                            )}
                            {lastPayment && (
                                <>
                                    <div>
                                        <p className="text-gray-500">Last Amount</p>
                                        <p className="font-medium">₹{Number(lastPayment.amount || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Method</p>
                                        <p className="font-medium capitalize">{(lastPayment.method || 'offline').replace('_',' ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Date</p>
                                        <p className="font-medium">{format(new Date(lastPayment.date), 'MMM dd, yyyy')}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Status</p>
                                        <p className="font-medium">Completed</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </AnimatedCard>
                )}
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col">
            <div className="bg-black rounded-xl overflow-hidden relative flex-1">
                {/* Scanner Overlay */}
                <div id="reader" className="w-full h-full object-cover" />
                
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center text-white">
                    <h1 className="font-medium">Master Scanner</h1>
                    <button onClick={switchCamera} className="p-2 bg-white/20 rounded-full backdrop-blur-md">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Scan Frame Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1" />
                    </div>
                </div>

                {/* Status/Error Overlay */}
                {(loading || error) && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                        <div className="text-white text-center p-6">
                            {loading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    <p>Fetching details...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <AlertTriangle className="w-12 h-12 text-red-500" />
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
                Scan a student's Digital ID QR code to manage them
            </p>
        </div>
    )
}
