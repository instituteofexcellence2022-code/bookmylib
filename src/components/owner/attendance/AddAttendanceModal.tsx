'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, Calendar, Clock, Search, MapPin } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { toast } from 'react-hot-toast'
import { getOwnerBranches } from '@/actions/branch'
import { getOwnerStudents } from '@/actions/owner/students'
import { createManualAttendance } from '@/actions/owner/attendance'

interface Branch {
  id: string
  name: string
}

interface StudentItem {
  id: string
  name: string
  email?: string | null
}

interface AddAttendanceModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddAttendanceModal({ onClose, onSuccess }: AddAttendanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  const now = useMemo(() => new Date(), [])
  const [form, setForm] = useState({
    studentQuery: '',
    studentId: '',
    checkInDate: now.toISOString().slice(0, 10),
    checkInTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    checkOutDate: '',
    checkOutTime: '',
    status: 'present',
    remarks: ''
  })
  const [studentResults, setStudentResults] = useState<StudentItem[]>([])
  const [searching, setSearching] = useState(false)
  type RawStudent = { id: string; name: string; email?: string | null }

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await getOwnerBranches()
        if (res.success && res.data) {
          setBranches(res.data)
          if (res.data.length > 0) setSelectedBranchId(res.data[0].id)
        }
      } catch {
        // ignore
      }
    }
    fetchBranches()
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!form.studentQuery || form.studentQuery.length < 2) {
        setStudentResults([])
        return
      }
      setSearching(true)
      try {
        const res = await getOwnerStudents({ search: form.studentQuery, limit: 10 })
        if (res.success && res.data) {
          const items: StudentItem[] = res.data.students.map((s: RawStudent) => ({ id: s.id, name: s.name, email: s.email }))
          setStudentResults(items)
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [form.studentQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.studentId) {
      toast.error('Select a student')
      return
    }
    if (!selectedBranchId) {
      toast.error('Select a branch')
      return
    }
    setLoading(true)
    try {
      const checkIn = new Date(`${form.checkInDate}T${form.checkInTime}`)
      let checkOut: Date | undefined
      if (form.checkOutDate && form.checkOutTime) {
        checkOut = new Date(`${form.checkOutDate}T${form.checkOutTime}`)
      }
      const res = await createManualAttendance({
        studentId: form.studentId,
        branchId: selectedBranchId,
        checkIn,
        checkOut,
        status: form.status,
        remarks: form.remarks
      })
      if (res.success) {
        toast.success('Attendance added')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to add attendance')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Attendance</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                >
                  {branches.map(b => <option value={b.id} key={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Student</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type name or email"
                  value={form.studentQuery}
                  onChange={(e) => setForm(prev => ({ ...prev, studentQuery: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
              {searching && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
              {!searching && studentResults.length > 0 && (
                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-auto">
                  {studentResults.map(s => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setForm(prev => ({ ...prev, studentId: s.id, studentQuery: `${s.name}${s.email ? ' (' + s.email + ')' : ''}` }))}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${form.studentId === s.id ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                    >
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.email || ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Check In</label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={e => setForm(prev => ({ ...prev, checkInDate: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
                <div className="relative w-32">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={form.checkInTime}
                    onChange={e => setForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Check Out (optional)</label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.checkOutDate}
                    onChange={e => setForm(prev => ({ ...prev, checkOutDate: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
                <div className="relative w-32">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={form.checkOutTime}
                    onChange={e => setForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave empty for active session.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="present">Present</option>
                <option value="short_session">Short Session</option>
                <option value="full_day">Full Day</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Remarks</label>
              <input
                type="text"
                value={form.remarks}
                onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <AnimatedButton
              type="submit"
              isLoading={loading}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Attendance
            </AnimatedButton>
          </div>
        </form>
      </div>
    </div>
  )
}
