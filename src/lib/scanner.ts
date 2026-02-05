/**
 * Standard configuration for HTML5QrcodeScanner to ensure consistent performance
 * across the application.
 */

export const SCANNER_CONFIG = {
  fps: 20,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  videoConstraints: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    facingMode: "environment" as const
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
