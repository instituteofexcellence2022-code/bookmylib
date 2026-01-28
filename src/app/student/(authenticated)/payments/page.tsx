import React from 'react'
import PaymentClient from './PaymentClient'

export const metadata = {
  title: 'Payments | Student Portal',
  description: 'Manage payments and view history'
}

export default function PaymentsPage() {
  return (
    <div className="max-w-7xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments & Subscriptions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Purchase plans, settle fees, and view transaction history.
        </p>
      </div>
      
      <PaymentClient />
    </div>
  )
}
