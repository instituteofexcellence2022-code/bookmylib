import { getPlatformSettings } from '@/actions/admin/settings'
import SettingsPageClient from '@/components/admin/settings/SettingsPageClient'

export default async function AdminSettingsPage() {
    const settings = await getPlatformSettings()
    
    return <SettingsPageClient settings={settings} />
}