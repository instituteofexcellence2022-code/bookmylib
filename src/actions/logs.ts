'use server'

import { prisma } from '@/lib/prisma'
import { unstable_noStore as noStore } from 'next/cache'

export type ActivityLog = {
  id: string
  type: 'staff_activity' | 'attendance' | 'payment'
  title: string
  description: string
  timestamp: Date
  metadata?: any
  user?: {
    name: string
    role: string
    image?: string | null
  }
  actor?: {
    name: string
    role: string
    image?: string | null
  }
}

export async function getBranchLogs(branchId: string, limit = 50): Promise<ActivityLog[]> {
  noStore()
  try {
    // Fetch all staff for actor lookup
    const allStaff = await prisma.staff.findMany({
      where: { branchId },
      select: { id: true, name: true, role: true, image: true }
    })
    const staffMap = new Map(allStaff.map(s => [s.id, s]))

    // Fetch Branch Owner info
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { ownerId: true, libraryId: true }
    })
    
    let owner = null;
    if (branch?.ownerId) {
      owner = await prisma.owner.findUnique({
        where: { id: branch.ownerId },
        select: { id: true, name: true, image: true }
      })
    } else if (branch?.libraryId) {
       // Fallback to finding first owner of library if branch has no explicit owner
       const firstOwner = await prisma.owner.findFirst({
         where: { libraryId: branch.libraryId },
         select: { id: true, name: true, image: true }
       })
       owner = firstOwner
    }

    const ownerActor = {
      name: owner?.name || 'Owner',
      role: 'Owner',
      image: owner?.image || null
    }

    // 1. Fetch Staff Activities (where staff belongs to this branch)
    const staffActivities = await prisma.staffActivity.findMany({
      where: {
        staff: {
          branchId: branchId
        }
      },
      include: {
        staff: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // 2. Fetch Attendance (Students checking in/out)
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        branchId: branchId
      },
      include: {
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // 3. Fetch Payments
    const payments = await prisma.payment.findMany({
      where: {
        branchId: branchId
      },
      include: {
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Transform and normalize data
    const formatRole = (role: string) => {
      if (!role) return 'Staff'
      switch (role.toLowerCase()) {
        case 'manager': return 'Branch Manager'
        case 'assistant': return 'Library Assistant'
        case 'support': return 'Support Staff'
        case 'admin': return 'Administrator'
        default: return role
      }
    }

    const normalizedStaffActivities: ActivityLog[] = staffActivities.map(activity => {
      let actor = undefined;
      
      // 1. Try to resolve actor from metadata (new standard)
      if (activity.metadata) {
        try {
          const meta = JSON.parse(activity.metadata)
          if (meta.performedBy) {
            const { type, id } = meta.performedBy
            if (type === 'owner') {
              actor = ownerActor
            } else if (type === 'staff' && id) {
              const staff = staffMap.get(id)
              if (staff) {
                actor = {
                  name: staff.name,
                  role: formatRole(staff.role),
                  image: staff.image
                }
              }
            } else if (type === 'system') {
              actor = { name: 'System', role: 'Automated System', image: null }
            }
          }
        } catch (e) {
          // Ignore parse errors, fall back to heuristic
        }
      }

      // 2. Fallback heuristic for older logs or missing metadata
      if (!actor) {
        // If account created/updated/deleted, typically done by Owner
        const isStaffEntity = activity.entity === 'Staff Management' || activity.entity.trim() === 'Staff Management';
        const isOwnerAction = ['create', 'update', 'delete'].includes(activity.type);

        if (isOwnerAction && isStaffEntity) {
          actor = ownerActor
        }
      }
      
      return {
        id: activity.id,
        type: 'staff_activity',
        title: activity.action,
        description: activity.details || '',
        timestamp: activity.createdAt,
        metadata: {
          status: activity.status,
          entity: activity.entity
        },
        user: {
          name: activity.staff.name,
          role: formatRole(activity.staff.role),
          image: activity.staff.image
        },
        actor
      }
    })

    const normalizedAttendance: ActivityLog[] = attendanceRecords.map(record => {
      let actor = undefined
      if (record.verifiedBy) {
        // Check if verified by Owner
        if (owner && record.verifiedBy === owner.id) {
          actor = ownerActor
        } else {
          // Check if verified by Staff
          const staff = staffMap.get(record.verifiedBy)
          if (staff) {
            actor = {
              name: staff.name,
              role: formatRole(staff.role),
              image: staff.image
            }
          }
        }
      }

      return {
        id: record.id,
        type: 'attendance',
        title: record.status === 'present' ? 'Check In' : 'Attendance Update',
        description: `${record.student.name} marked as ${record.status}`,
        timestamp: record.createdAt,
        metadata: {
          status: record.status,
          method: record.method
        },
        user: {
          name: record.student.name,
          role: 'Student',
          image: record.student.image
        },
        actor
      }
    })

    const normalizedPayments: ActivityLog[] = payments.map(payment => {
      let actor = undefined
      if (payment.collectedBy) {
        // Check if collected by Owner
        if (owner && payment.collectedBy === owner.id) {
          actor = ownerActor
        } else {
          // Check if collected by Staff
          const staff = staffMap.get(payment.collectedBy)
          if (staff) {
            actor = {
              name: staff.name,
              role: formatRole(staff.role),
              image: staff.image
            }
          }
        }
      }

      return {
        id: payment.id,
        type: 'payment',
        title: 'Payment Received',
        description: `Received ₹${payment.amount} from ${payment.student.name}`,
        timestamp: payment.createdAt,
        metadata: {
          amount: payment.amount,
          method: payment.method,
          status: payment.status
        },
        user: {
          name: payment.student.name,
          role: 'Student',
          image: payment.student.image
        },
        actor
      }
    })

    // Combine and sort
    const allLogs = [
      ...normalizedStaffActivities,
      ...normalizedAttendance,
      ...normalizedPayments
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return allLogs

  } catch (error) {
    console.error('Error fetching branch logs:', error)
    return []
  }
}
