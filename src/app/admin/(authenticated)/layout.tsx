import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAuthenticatedAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const admin = await getAuthenticatedAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  return <AdminLayout user={admin}>{children}</AdminLayout>
}
