import { MetadataRoute } from 'next'
import { cookies } from 'next/headers'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies()
  const theme = cookieStore.get('app-theme')?.value || 'discover'

  let themeColor = '#0d9488' // discover (teal-600)
  let startUrl = '/'

  if (theme === 'student') {
    themeColor = '#2563eb' // student (blue-600)
    startUrl = '/student/home'
  } else if (theme === 'staff') {
    themeColor = '#059669' // staff (emerald-600)
    startUrl = '/staff/dashboard'
  } else if (theme === 'owner') {
    themeColor = '#d97706' // owner (amber-600)
    startUrl = '/owner/dashboard'
  }

  // Ensure startUrl is valid for PWA scope
  // Ideally, start_url should be within the scope. Scope defaults to /.
  
  return {
    name: 'BookMyLib - Modern Library Management',
    short_name: 'BookMyLib',
    description: 'Complete library management solution for owners, staff, and students.',
    start_url: startUrl,
    id: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      {
        src: `/api/icon?theme=${theme}`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Student Portal',
        short_name: 'Student',
        description: 'Access your student dashboard',
        url: '/student/home',
        icons: [{ src: '/api/icon?theme=student', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Staff Portal',
        short_name: 'Staff',
        description: 'Access staff dashboard',
        url: '/staff/dashboard',
        icons: [{ src: '/api/icon?theme=staff', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Owner Portal',
        short_name: 'Owner',
        description: 'Manage your library',
        url: '/owner/dashboard',
        icons: [{ src: '/api/icon?theme=owner', sizes: '192x192', type: 'image/png' }]
      }
    ]
  }
}
