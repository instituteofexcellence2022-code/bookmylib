/**
 * Standard configuration for HTML5QrcodeScanner to ensure consistent performance
 * across the application.
 */

export const SCANNER_CONFIG = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  videoConstraints: {
    facingMode: "environment"
  }
}

/**
 * Common success callback type for scanner
 */
export type ScanSuccessCallback = (decodedText: string, decodedResult: unknown) => void;

/**
 * Common error callback type for scanner
 */
export type ScanErrorCallback = (errorMessage: string) => void
