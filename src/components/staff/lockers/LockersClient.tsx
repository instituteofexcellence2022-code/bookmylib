'use client'

import { 
  deleteLocker, 
  updateLocker, 
  getLockerHistory,
  getEligibleStudentsForLocker,
  assignLocker,
  unassignLocker
} from '@/actions/staff/lockers'
import { LockerManagement, LockerWithRelations } from '@/components/shared/lockers/LockerManagement'

interface LockersClientProps {
  initialLockers: LockerWithRelations[]
}

export function LockersClient({ initialLockers }: LockersClientProps) {
  const actions = {
    update: updateLocker,
    delete: deleteLocker,
    getHistory: getLockerHistory,
    getEligibleStudents: getEligibleStudentsForLocker,
    assign: assignLocker,
    unassign: unassignLocker
  }

  return (
    <LockerManagement 
      initialLockers={initialLockers}
      actions={actions}
    />
  )
}
