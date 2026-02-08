import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { Suspense } from 'react'

export default function ResetPasswordPage() {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Suspense fallback={<div>Loading...</div>}>
              <ResetPasswordForm userType="staff" />
          </Suspense>
      </div>
  )
}
