import React from 'react'
import { getStudentReferralData } from '@/actions/student'
import ReferralClient from './ReferralClient'

export default async function ReferPage() {
    const data = await getStudentReferralData()

    return (
        <ReferralClient data={data} />
    )
}