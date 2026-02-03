import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// --- Resend Configuration (For Domain Users) ---
// Initialize Resend with API key
// We provide a fallback to allow the build to pass even if the env var is missing
export const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export const EMAIL_SENDER = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `Library App <${process.env.SMTP_USER}>` : 'Library App <onboarding@resend.dev>');

// --- Nodemailer Configuration (For Gmail / SMTP Users) ---
// Use this if you don't have a domain and want to use Gmail or other SMTP
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email address (e.g., yourname@gmail.com)
    pass: process.env.SMTP_PASS, // Your App Password (not your gmail password)
  },
  // Optimizations for Google SMTP
  pool: true, // Use pooled connections
  maxConnections: 5, // Limit concurrent connections
  maxMessages: 100, // Limit messages per connection
  rateLimit: 10, // Limit messages per second (approx)
  // Network optimizations
  family: 4, // Force IPv4 to avoid IPv6 timeouts
  connectionTimeout: 10000, // 10 seconds timeout for connection
  socketTimeout: 10000, // 10 seconds timeout for socket
};

export const transporter = nodemailer.createTransport(smtpConfig);

// Helper to determine which service to use
// Priority: SMTP (Google/Other) > Resend
const hasSmtp = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_');

export const useResend = !hasSmtp && hasResend;

// Log configuration on server start
if (typeof window === 'undefined') {
  if (hasSmtp) {
    console.log('📧 Email Service: Configured to use SMTP (Nodemailer)')
  } else if (hasResend) {
    console.log('📧 Email Service: Configured to use Resend')
  } else {
    console.warn('⚠️ Email Service: No email service configured. Please set SMTP_USER/SMTP_PASS or RESEND_API_KEY')
  }
}
