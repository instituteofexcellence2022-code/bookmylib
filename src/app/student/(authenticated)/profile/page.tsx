import React from 'react'
import { getStudentProfile } from '@/actions/student'
import { getLikedQuoteIds, getQuotes } from '@/actions/quotes'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
    const [profileResult, likedIds, allQuotes] = await Promise.all([
        getStudentProfile(),
        getLikedQuoteIds(),
        getQuotes()
    ])

    if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.error || 'Failed to load profile')
    }

    const likedQuotes = allQuotes.filter(q => likedIds.includes(q.id))

    return (
        <ProfileClient initialData={profileResult.data} likedQuotes={likedQuotes} />
    )
}
