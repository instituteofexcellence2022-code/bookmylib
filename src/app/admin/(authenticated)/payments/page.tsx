import React from 'react'
import { getPayments, getPaymentStats } from '@/actions/admin/platform-payments'
import { PaymentPageClient } from '@/components/admin/payments/PaymentPageClient'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string, status?: string, search?: string }> }) {
    const { page: pageParam, status: statusParam, search: searchParam } = await searchParams
    const page = Number(pageParam) || 1
    const status = statusParam || 'all'
    const search = searchParam || ''

    const [stats, paymentsData] = await Promise.all([
        getPaymentStats(),
        getPayments({ page, limit: 10, status, search })
    ])

    return (
        <PaymentPageClient 
            initialPayments={paymentsData.payments}
            stats={stats}
            totalPages={paymentsData.pages}
            currentPage={page}
        />
    )
}
