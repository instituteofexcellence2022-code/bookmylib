import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// --- Resend Configuration (For Domain Users) ---
// Initialize Resend with API key
// We provide a fallback to allow the build to pass even if the env var is missing
export const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export const EMAIL_SENDER = process.env.EMAIL_FROM || 'Library App <onboarding@resend.dev>';

// --- Nodemailer Configuration (For Gmail / SMTP Users) ---
// Use this if you don't have a domain and want to use Gmail or other SMTP
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email address (e.g., yourname@gmail.com)
    pass: process.env.SMTP_PASS, // Your App Password (not your gmail password)
  },
};

export const transporter = nodemailer.createTransport(smtpConfig);

// Helper to determine which service to use
export const useResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_');
