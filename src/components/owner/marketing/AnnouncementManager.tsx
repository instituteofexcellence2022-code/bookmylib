'use client'

import React, { useState, useEffect } from 'react'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { Megaphone, Trash2, X, Calendar, CheckCircle, Edit2, Search, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getOwnerAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncementStatus, updateAnnouncement } from '@/actions/announcement'
import { getOwnerBranches } from '@/actions/branch'
import { format, isPast, differenceInDays } from 'date-fns'

interface AnnouncementData {
  id: string
  title: string
  content: string
  target: string
  branchId: string | null
  isActive: boolean
  expiresAt: Date | string | null
  createdAt: Date | string
}

interface BranchData {
  id: string
  name: string
}

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [branches, setBranches] = useState<BranchData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null)

  // Filters & Search
  const [filterTarget, setFilterTarget] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, expiring

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [target, setTarget] = useState('all')
  const [branchId, setBranchId] = useState('all')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [announcementsData, branchesData] = await Promise.all([
        getOwnerAnnouncements(),
        getOwnerBranches()
      ])
      setAnnouncements(announcementsData as unknown as AnnouncementData[])
      setBranches(branchesData as unknown as BranchData[])
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (announcement: AnnouncementData) => {
    setEditingId(announcement.id)
    setTitle(announcement.title)
    setContent(announcement.content)
    setTarget(announcement.target)
    setBranchId(announcement.branchId || 'all')
    setExpiresAt(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : '')
    setShowCreateForm(true)
  }

  const handleCancel = () => {
    setShowCreateForm(false)
    setEditingId(null)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        title,
        content,
        target,
        branchId,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }

      let res
      if (editingId) {
        res = await updateAnnouncement(editingId, payload)
      } else {
        res = await createAnnouncement(payload)
      }

      if (res.success) {
        toast.success(editingId ? 'Announcement updated' : 'Announcement created')
        setShowCreateForm(false)
        setEditingId(null)
        resetForm()
        loadData()
      } else {
        toast.error(res.error || 'Operation failed')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setTarget('all')
    setBranchId('all')
    setExpiresAt('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    
    try {
      const res = await deleteAnnouncement(id)
      if (res.success) {
        toast.success('Announcement deleted')
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await toggleAnnouncementStatus(id, !currentStatus)
      if (res.success) {
        toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'}`)
        setAnnouncements(prev => prev.map(a => 
          a.id === id ? { ...a, isActive: !currentStatus } : a
        ))
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filteredAnnouncements = announcements
    .filter(a => {
      if (filterTarget !== 'all' && a.target !== filterTarget) return false
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          a.title.toLowerCase().includes(searchLower) ||
          a.content.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortBy === 'expiring') {
        if (!a.expiresAt) return 1
        if (!b.expiresAt) return -1
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      }
      return 0
    })

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'students': return 'Students Only'
      case 'staff': return 'Staff Only'
      default: return 'Everyone'
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading announcements...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Announcements</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
              <select
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-auto"
              >
                <option value="all">All Targets</option>
                <option value="all_users">All Users</option>
                <option value="students">Students Only</option>
                <option value="staff">Staff Only</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="col-span-2 sm:col-span-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
          </div>
          
          <div className="w-full sm:w-auto">
            <AnimatedButton
              onClick={() => {
                resetForm()
                setShowCreateForm(true)
              }}
              variant="primary"
              icon="add"
              className="w-full justify-center sm:w-auto"
            >
              New Announcement
            </AnimatedButton>
          </div>
        </div>

      {showCreateForm && (
        <CompactCard className="p-6 border-l-4 border-l-purple-500">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium mb-4">{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <FormInput
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Library closed on Sunday"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter announcement details..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormSelect
                label="Target Audience"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                options={[
                  { label: 'Everyone', value: 'all' },
                  { label: 'All Students', value: 'students' },
                  { label: 'Active Students', value: 'active_students' },
                  { label: 'Staff', value: 'staff' }
                ]}
              />

              <FormSelect
                label="Branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                options={[
                  { label: 'All Branches', value: 'all' },
                  ...branches.map(b => ({ label: b.name, value: b.id }))
                ]}
              />

              <FormInput
                label="Expires At (Optional)"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-4 gap-3">
              <button 
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <AnimatedButton type="submit" isLoading={submitting} variant="primary">
                {editingId ? 'Update Announcement' : 'Post Announcement'}
              </AnimatedButton>
            </div>
          </form>
        </CompactCard>
      )}

      <div className="grid gap-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-lg">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No announcements found</p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <CompactCard key={announcement.id} className={`p-5 ${!announcement.isActive ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {announcement.title}
                  </h3>
                  {!announcement.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      Draft
                    </span>
                  )}
                  {announcement.expiresAt && isPast(new Date(announcement.expiresAt)) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expired
                    </span>
                  )}
                  {announcement.expiresAt && !isPast(new Date(announcement.expiresAt)) && differenceInDays(new Date(announcement.expiresAt), new Date()) <= 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expiring soon
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(announcement.id, announcement.isActive)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      announcement.isActive 
                        ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' 
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={announcement.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {announcement.isActive ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                {announcement.content}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  Target: {getTargetLabel(announcement.target)}
                </span>
                {announcement.branchId && (
                  <span className="flex items-center gap-1">
                    Branch: {branches.find(b => b.id === announcement.branchId)?.name || 'All Branches'}
                  </span>
                )}
                {announcement.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expires: {format(new Date(announcement.expiresAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </CompactCard>
          ))
        )}
      </div>
    </div>
  )
}
