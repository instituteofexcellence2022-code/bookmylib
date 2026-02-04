'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, RefreshCw, User, CheckCircle, AlertTriangle, CreditCard, FileText, ArrowLeft, ArrowRight, ShieldCheck, LogIn, LogOut, ExternalLink, Store, Clock, Calendar, Zap, ZapOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getStudentDetailsForScanner } from '@/actions/owner/students'
import { verifyStudentQR } from '@/actions/owner/attendance'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import Image from 'next/image'
import { format, differenceInCalendarDays, formatDistanceToNow } from 'date-fns'
import { formatSeatNumber } from '@/lib/utils'
import { verifyPayment } from '@/actions/owner/finance'
import { verifyStudentGovtId } from '@/actions/owner'

export function OwnerScannerClient() {
    const router = useRouter()
    const [scanning, setScanning] = useState(false) // Start false until branch selected
    const [studentData, setStudentData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
    const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const mountedRef = useRef(false)
    
    // Owner specific state
    // const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]) // Not strictly needed for auto-scan but kept if we need to select for registration
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
    
    // Automation State
    const [autoProcess, setAutoProcess] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [successState, setSuccessState] = useState<{type: 'check-in' | 'check-out', timestamp: Date} | null>(null)

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

    // Auto-process effect
    useEffect(() => {
        if (studentData && autoProcess && !processing && !successState && scanning === false) {
             const { subscription, student } = studentData
             const isBlocked = student.isBlocked
             const daysLeft = subscription ? differenceInCalendarDays(new Date(subscription.endDate), new Date()) : null
             const isExpired = typeof daysLeft === 'number' && daysLeft < 0
             
             // Only auto-process if Active, Not Blocked, Not Expired, and Branch Detected
             if (subscription && !isBlocked && !isExpired && selectedBranchId === subscription.branchId) {
                  // Small delay to let user see "Student Found" before action
                  const timer = setTimeout(() => {
                      handleAutoAttendance()
                  }, 600)
                  return () => clearTimeout(timer)
             }
        }
    }, [studentData, autoProcess, selectedBranchId, processing, successState, scanning])

    const handleAutoAttendance = async () => {
        if (!studentData?.student?.id || !selectedBranchId) return
        setProcessing(true)
        
        try {
            const res = await verifyStudentQR(studentData.student.id, selectedBranchId)
            
            if (res.success) {
                // Play success sound again or different tone
                if (navigator.vibrate) navigator.vibrate([100, 50, 100])
                
                setSuccessState({
                    type: res.type as 'check-in' | 'check-out',
                    timestamp: new Date()
                })
                
                // Refresh data
                const updatedRes = await getStudentDetailsForScanner(studentData.student.id)
                if (updatedRes.success) {
                    setStudentData(updatedRes.data)
                }

                // Auto reset after delay
                setTimeout(() => {
                    handleReset()
                }, 2000)
            } else {
                 toast.error(res.error || 'Auto-process failed')
                 setProcessing(false)
            }
        } catch (e) {
            console.error(e)
            setProcessing(false)
        }
    }

    useEffect(() => {
        mountedRef.current = true
        
        // Start scanner immediately
        setScanning(true)

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
                    { fps: 10, qrbox: { width: 250, height: 250 } },
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
                // assume text is ID if not JSON
            }

            const res = await getStudentDetailsForScanner(studentId)
            
            if (res.success && res.data) {
                setStudentData(res.data)
                // Auto-detect branch from subscription or student home branch
                if (res.data.subscription?.branchId) {
                    setSelectedBranchId(res.data.subscription.branchId)
                } else if (res.data.candidateBranchId) {
                    setSelectedBranchId(res.data.candidateBranchId)
                } else {
                    setSelectedBranchId(null)
                }
                setScanning(false)
            } else {
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
        } finally {
            if (!studentData) setLoading(false)
        }
    }

    const handleReset = () => {
        setStudentData(null)
        setScanning(true)
        setError(null)
        setLoading(false)
        setSelectedBranchId(null)
        setSuccessState(null)
        setProcessing(false)
    }

    const handleAttendance = async (type: 'check-in' | 'check-out') => { // type ignored as verifyStudentQR handles it logic internally mostly, but we can use it for UI
        if (!studentData?.student?.id || !selectedBranchId) return
        
        try {
            // Note: verifyStudentQR handles both check-in and check-out based on current status
            // But we can call it to perform the action. 
            // Wait, verifyStudentQR does EVERYTHING (check subscription, auto check-out, etc.)
            // So we just call it.
            
            const res = await verifyStudentQR(studentData.student.id, selectedBranchId)
            
            if (res.success) {
                toast.success(res.type === 'check-in' ? 'Successfully checked in' : 'Successfully checked out')
                
                // Update local state
                const updatedRes = await getStudentDetailsForScanner(studentData.student.id)
                if (updatedRes.success) {
                    setStudentData(updatedRes.data)
                }
            } else {
                toast.error(res.error || 'Failed to process attendance')
            }
        } catch (error) {
            toast.error('System error')
        }
    }
    
    const handlePaymentVerify = async (action: 'approve' | 'reject') => {
        if (!studentData?.pendingPayment?.id) return
        try {
            await verifyPayment(studentData.pendingPayment.id, action)
            toast.success(action === 'approve' ? 'Payment verified' : 'Payment rejected')
            const updatedRes = await getStudentDetailsForScanner(studentData.student.id)
            if (updatedRes.success) setStudentData(updatedRes.data)
        } catch (e) {
            console.error(e)
            toast.error('Failed to verify payment')
        }
    }
    
    const handleGovtIdVerify = async (status: 'verified' | 'rejected') => {
        if (!studentData?.student?.id) return
        try {
            await verifyStudentGovtId(studentData.student.id, status)
            toast.success(status === 'verified' ? 'Document verified' : 'Document rejected')
            const updatedRes = await getStudentDetailsForScanner(studentData.student.id)
            if (updatedRes.success) setStudentData(updatedRes.data)
        } catch (e) {
            console.error(e)
            toast.error('Failed to update document status')
        }
    }

    const switchCamera = () => {
        if (cameras.length <= 1) return
        const currentIndex = cameras.findIndex(c => c.id === currentCameraId)
        const nextIndex = (currentIndex + 1) % cameras.length
        setCurrentCameraId(cameras[nextIndex].id)
    }

    // Branch Selection View Removed

    if (studentData) {
        const { student, subscription, attendance: attendanceLogs, pendingPayment, lastPayment } = studentData
        // Get the latest attendance record for status
        const attendance = attendanceLogs && attendanceLogs.length > 0 ? attendanceLogs[0] : null
        
        const isCheckedIn = !!(attendance && !attendance.checkOut)
        const daysLeft = subscription ? differenceInCalendarDays(new Date(subscription.endDate), new Date()) : null
        const isExpired = typeof daysLeft === 'number' && daysLeft < 0

        // Success Overlay
        if (successState) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-600 text-white animate-in fade-in zoom-in duration-300">
                    <div className="text-center space-y-6 p-8">
                        <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_1s_infinite]">
                            <CheckCircle className="w-16 h-16 text-white" />
                        </div>
                        <h2 className="text-4xl font-bold tracking-tight">
                            {successState.type === 'check-in' ? 'Checked In!' : 'Checked Out!'}
                        </h2>
                        <p className="text-2xl font-medium opacity-90">
                            {format(successState.timestamp, 'h:mm a')}
                        </p>
                        <p className="opacity-75">Resuming scanner...</p>
                    </div>
                </div>
            )
        }
        
        // Processing Overlay
        if (processing) {
             return (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white">
                     <div className="text-center space-y-4">
                         <RefreshCw className="w-12 h-12 animate-spin mx-auto" />
                         <p className="text-xl font-medium">Processing...</p>
                     </div>
                 </div>
             )
        }

        const isBlocked = student.isBlocked

        // Case: Blocked
        if (isBlocked) {
             return (
                 <div className="max-w-2xl mx-auto space-y-6 p-4">
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
                                 <div className="mt-2">
                                     <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                         Blocked
                                     </span>
                                 </div>
                             </div>
                         </div>
                     </AnimatedCard>
 
                     <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-center space-y-3">
                         <div className="w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto">
                             <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
                         </div>
                         <h3 className="font-semibold text-lg">Student is Blocked</h3>
                         <p className="text-sm text-gray-600 dark:text-gray-400">
                             This student has been blocked from accessing the library. Please contact support or unblock them from the students list.
                         </p>
                         <AnimatedButton 
                             onClick={() => router.push(`/owner/students/${student.id}`)}
                             className="w-full bg-red-600 hover:bg-red-700 text-white"
                         >
                             View Profile
                         </AnimatedButton>
                     </div>
                 </div>
             )
        }

        // Case: Expired (Has subscription but expired)
        if (subscription && isExpired) {
             return (
                 <div className="max-w-2xl mx-auto space-y-6 p-4">
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
                                 <div className="mt-2">
                                     <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                         Plan Expired
                                     </span>
                                 </div>
                             </div>
                         </div>
                     </AnimatedCard>
 
                     <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-center space-y-3">
                         <div className="w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto">
                             <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                         </div>
                         <h3 className="font-semibold text-lg">Subscription Expired</h3>
                         <p className="text-sm text-gray-600 dark:text-gray-400">
                             The subscription for <strong>{subscription.branch.name}</strong> expired on {format(new Date(subscription.endDate), 'MMM dd, yyyy')}.
                         </p>
                         <AnimatedButton 
                             onClick={() => router.push(`/owner/students/${student.id}`)}
                             className="w-full bg-red-600 hover:bg-red-700 text-white"
                         >
                             Renew Subscription
                         </AnimatedButton>
                     </div>

                    {/* Show previous subscription details for reference */}
                    <AnimatedCard title="Last Subscription">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Plan</p>
                                <p className="font-medium">{subscription.plan.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Branch</p>
                                <p className="font-medium">{subscription.branch.name}</p>
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
                 </div>
             )
        }

        // Case: Not Registered (No active/pending subscription)
        if (!subscription && !pendingPayment) {
            return (
                <div className="max-w-2xl mx-auto space-y-6 p-4">
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
                                <div className="mt-2">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        Not Registered
                                    </span>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center space-y-3">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center mx-auto">
                            <Store className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="font-semibold text-lg">Not Registered in Your Library</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            This student does not have an active subscription in any of your branches.
                        </p>
                        <AnimatedButton 
                            onClick={() => router.push(`/owner/students/${student.id}`)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            Register / Add Plan
                        </AnimatedButton>
                    </div>
                </div>
            )
        }

        // Case: Registered (Standard View)
        return (
            <div className="max-w-2xl mx-auto space-y-6 p-4">
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
                        onClick={() => handleAttendance('check-in')} // Logic is same, handled by backend
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

                    {pendingPayment ? (
                        <div className="grid grid-cols-2 gap-2 col-span-2">
                            <AnimatedButton 
                                onClick={() => handlePaymentVerify('approve')}
                                className="h-auto flex-col p-3 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                <span>Verify Payment</span>
                            </AnimatedButton>
                            <AnimatedButton 
                                onClick={() => handlePaymentVerify('reject')}
                                className="h-auto flex-col p-3 gap-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            >
                                <X className="w-5 h-5" />
                                <span>Reject</span>
                            </AnimatedButton>
                        </div>
                    ) : (
                        <AnimatedButton 
                            variant="outline"
                            onClick={() => router.push(`/owner/finance?tab=accept&studentId=${student.id}&branchId=${subscription?.branchId || selectedBranchId || ''}`)}
                            className="h-auto flex-col p-4 gap-2 border-dashed"
                        >
                            <CreditCard className="w-6 h-6 text-emerald-600" />
                            <span>Accept Payment</span>
                        </AnimatedButton>
                    )}

                    <AnimatedButton 
                        variant="outline"
                        onClick={() => router.push(`/owner/issues/new?studentId=${student.id}`)}
                        className="h-auto flex-col p-4 gap-2 border-dashed"
                    >
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <span>Report Issue</span>
                    </AnimatedButton>

                    <AnimatedButton 
                        variant="secondary"
                        onClick={() => router.push(`/owner/students/${student.id}`)}
                        className="col-span-2 flex items-center justify-center gap-2 py-3"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Full Profile
                    </AnimatedButton>
                </div>

                {(student.govtIdStatus === 'pending' && student.govtIdUrl) && (
                    <AnimatedCard title="Document Verification">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-500" />
                                <span className="text-sm text-gray-600">Government ID pending verification</span>
                            </div>
                            
                            {/* Preview */}
                            <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <Image 
                                    src={student.govtIdUrl} 
                                    alt="Government ID" 
                                    fill 
                                    className="object-contain"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <AnimatedButton 
                                    variant="outline"
                                    onClick={() => router.push(`/owner/students/${student.id}`)}
                                    className="text-xs"
                                >
                                    View Profile
                                </AnimatedButton>
                                <AnimatedButton 
                                    onClick={() => handleGovtIdVerify('verified')}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                >
                                    Approve
                                </AnimatedButton>
                                <AnimatedButton 
                                    onClick={() => handleGovtIdVerify('rejected')}
                                    className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 text-xs"
                                >
                                    Reject
                                </AnimatedButton>
                            </div>
                        </div>
                    </AnimatedCard>
                )}
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
                                <div className="col-span-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 flex items-center justify-between">
                                    <div>
                                        <p className="text-yellow-700 dark:text-yellow-300 font-medium">Pending Payment</p>
                                        <p className="text-yellow-700 dark:text-yellow-300">₹{Number(pendingPayment.amount || 0).toFixed(2)} • {pendingPayment.method?.replace('_',' ') || 'offline'}</p>
                                    </div>
                                    <AnimatedButton 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/owner/students/${student.id}?tab=payments`)}
                                        className="h-8 px-3 text-xs bg-white/50 border-yellow-300 text-yellow-800 hover:bg-white"
                                    >
                                        View Details
                                    </AnimatedButton>
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

                {/* Recent Attendance History */}
                {attendanceLogs && attendanceLogs.length > 0 && (
                    <AnimatedCard title="Recent Activity">
                        <div className="space-y-4">
                            {attendanceLogs.map((log: any) => (
                                <div key={log.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0 border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                             log.checkOut ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'
                                         }`}>
                                             {log.checkOut ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                                         </div>
                                         <div>
                                             <p className="font-medium">{format(new Date(log.checkIn), 'MMM dd, yyyy')}</p>
                                             <p className="text-xs text-gray-500">
                                                 {format(new Date(log.checkIn), 'h:mm a')}
                                                 {log.checkOut && ` - ${format(new Date(log.checkOut), 'h:mm a')}`}
                                             </p>
                                         </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            log.checkOut 
                                            ? 'bg-gray-100 text-gray-600' 
                                            : 'bg-green-100 text-green-700 font-medium'
                                        }`}>
                                            {log.checkOut ? 'Completed' : 'Active Now'}
                                        </span>
                                    </div>
                                </div>
                            ))}
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
                <div id="reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
                
                {/* Auto-Process Toggle */}
                <div className="absolute top-16 right-4 z-20">
                     <button
                         onClick={() => setAutoProcess(!autoProcess)}
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                             autoProcess 
                             ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                             : 'bg-black/40 text-white backdrop-blur-md border border-white/10'
                         }`}
                     >
                         {autoProcess ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                         {autoProcess ? 'Auto' : 'Manual'}
                     </button>
                </div>

                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center text-white">
                    <div className="flex flex-col">
                        <h1 className="font-medium">Master Scanner</h1>
                        <p className="text-xs text-gray-400">Scan Student QR</p>
                    </div>
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
