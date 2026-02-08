import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const theme = searchParams.get('theme') || 'discover'

  let bgColor = '#2563eb' // discover (blue-600) - Brand Color

  if (theme === 'student') {
    bgColor = '#2563eb' // student (blue-600)
  } else if (theme === 'staff') {
    bgColor = '#059669' // staff (emerald-600)
  } else if (theme === 'owner') {
    bgColor = '#d97706' // owner (amber-600)
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: bgColor,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="320"
          height="320"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  )
}
