import QRCode from 'qrcode'

export interface QRConfig {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark: string
    light: string
  }
}

export const DEFAULT_QR_CONFIG: QRConfig = {
  width: 1200,
  margin: 0,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
}

/**
 * Generates a high-quality QR code data URL with standardized settings.
 * @param text The content to encode in the QR code
 * @param options Optional overrides for the default configuration
 * @returns Promise resolving to the data URL string
 */
export async function generateHighQualityQR(
  text: string,
  options: Partial<QRConfig> = {}
): Promise<string> {
  const config = { ...DEFAULT_QR_CONFIG, ...options }
  
  try {
    return await QRCode.toDataURL(text, config)
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

/**
 * Generates a full URL for a branch QR code.
 * @param branchId The unique ID of the branch
 * @param token The secure token for the QR code
 * @param origin The window.location.origin (pass this from the client component)
 * @returns The full URL string
 */
export function generateBranchQRUrl(branchId: string, token: string, origin: string): string {
  return `${origin}/discover/${branchId}?qr_code=${token}`
}
