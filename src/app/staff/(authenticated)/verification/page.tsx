import { Metadata } from 'next'
import { StaffVerifyPaymentList } from '@/components/staff/verification/StaffVerifyPaymentList'

export const metadata: Metadata = {
  title: 'Payment Verification | Staff',
  description: 'Verify student payments',
}

export default function VerificationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Center</h1>
          <p className="text-sm text-gray-500 mt-1">Verify student payments and other pending items.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Payments</h2>
                <p className="text-sm text-gray-500">Verify offline payment proofs</p>
            </div>
        </div>
        <StaffVerifyPaymentList />
      </div>
    </div>
  )
}
