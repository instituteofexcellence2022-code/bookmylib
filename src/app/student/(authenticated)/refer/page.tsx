import React from 'react'
import { getStudentReferralData } from '@/actions/student'
import ReferralClient from './ReferralClient'

export default async function ReferPage() {
    const result = await getStudentReferralData()

    if (!result.success || !result.data) {
        return (
            <div className="p-6 text-center text-red-500">
                <p>Failed to load referral data. Please try again later.</p>
                <p className="text-sm text-gray-500 mt-2">{result.error}</p>
            </div>
        )
    }

    return (
        <ReferralClient data={result.data} />
    )
}