import { Resend } from 'resend';

// Initialize Resend with API key
// We provide a fallback to allow the build to pass even if the env var is missing
export const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export const EMAIL_SENDER = 'Library App <onboarding@resend.dev>'; // Default for testing
