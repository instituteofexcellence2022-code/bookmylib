import { Html5QrcodeSupportedFormats } from "html5-qrcode"

/**
 * Standard configuration for HTML5QrcodeScanner to ensure consistent performance
 * across the application.
 */

export const SCANNER_CONFIG = {
  fps: 25,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
  videoConstraints: {
    facingMode: "environment",
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    advanced: [{ focusMode: "continuous" }] as any
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
