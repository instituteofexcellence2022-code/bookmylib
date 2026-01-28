import React from 'react'
import { getStudentProfile } from '@/actions/student'
import { getLikedQuoteIds, getQuotes } from '@/actions/quotes'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
    const [profileData, likedIds, allQuotes] = await Promise.all([
        getStudentProfile(),
        getLikedQuoteIds(),
        getQuotes()
    ])

    const likedQuotes = allQuotes.filter(q => likedIds.includes(q.id))

    return (
        <ProfileClient initialData={profileData} likedQuotes={likedQuotes} />
    )
}
