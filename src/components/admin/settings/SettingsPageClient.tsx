'use client'

import { SettingsForm } from './SettingsForm'

interface SettingsPageClientProps {
    settings: any
}

export default function SettingsPageClient({ settings }: SettingsPageClientProps) {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage global configuration, feature flags, and maintenance mode.</p>
            </div>
            
            <SettingsForm initialSettings={settings} />
        </div>
    )
}