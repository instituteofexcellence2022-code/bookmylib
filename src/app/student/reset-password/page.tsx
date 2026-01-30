import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { Suspense } from 'react'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>
}) {
  const { token } = await searchParams

  if (!token) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
              <div className="text-center text-red-600">
                  Invalid request: Missing token
              </div>
          </div>
      )
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Suspense fallback={<div>Loading...</div>}>
              <ResetPasswordForm userType="student" token={token} />
          </Suspense>
      </div>
  )
}
