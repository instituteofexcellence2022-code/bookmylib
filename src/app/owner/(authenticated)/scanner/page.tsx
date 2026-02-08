import { OwnerScannerClient } from '@/components/owner/scanner/OwnerScannerClient'

export const metadata = {
    title: 'Master Scanner | Owner Portal',
    description: 'Scan student QR codes for attendance and management'
}

export default function ScannerPage() {
    return <OwnerScannerClient />
}
