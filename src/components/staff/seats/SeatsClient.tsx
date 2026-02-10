'use client'

import { SeatManagement, SeatWithRelations } from '@/components/shared/seats/SeatManagement'
import { 
  deleteSeat, 
  updateSeat, 
  getSeatHistory,
  getEligibleStudents,
  assignSeat,
  unassignSeat
} from '@/actions/staff/seats'

interface SeatsClientProps {
  initialSeats: SeatWithRelations[]
}

export function SeatsClient({ initialSeats }: SeatsClientProps) {
  const actions = {
    update: updateSeat,
    delete: deleteSeat,
    getHistory: getSeatHistory,
    getEligibleStudents: getEligibleStudents,
    assign: assignSeat,
    unassign: unassignSeat
  }

  return (
    <SeatManagement 
      initialSeats={initialSeats}
      actions={actions}
    />
  )
}
