import React from 'react'
import { getSubscriptions } from '@/actions/admin/platform-subscriptions'
import { getSaasPlans } from '@/actions/admin/platform-plans'
import { SubscriptionPageClient } from '@/components/admin/subscriptions/SubscriptionPageClient'

export default async function AdminSubscriptionsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const page = Number(searchParams.page) || 1
    const search = searchParams.search as string
    const status = searchParams.status as string
    const planId = searchParams.planId as string

    const [subscriptionData, plans] = await Promise.all([
        getSubscriptions({ page, search, status, planId }),
        getSaasPlans()
    ])

    return (
        <SubscriptionPageClient 
            initialSubscriptions={subscriptionData.subscriptions}
            plans={plans}
            totalPages={subscriptionData.pages}
            currentPage={page}
        />
    )
}
