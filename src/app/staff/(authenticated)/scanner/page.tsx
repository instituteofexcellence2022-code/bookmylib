import { ScannerClient } from './ScannerClient'

export default async function ScannerPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
    const { code } = await searchParams
    return <ScannerClient initialCode={code} />
}
