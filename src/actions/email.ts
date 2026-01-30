'use server'

import { resend, transporter, useResend, EMAIL_SENDER } from '@/lib/mail'
import ReceiptEmail from '@/emails/ReceiptEmail'
import WelcomeEmail from '@/emails/WelcomeEmail'
import SubscriptionExpiryEmail from '@/emails/SubscriptionExpiryEmail'
import TicketUpdateEmail from '@/emails/TicketUpdateEmail'
import ResetPasswordEmail from '@/emails/ResetPasswordEmail'
import AnnouncementEmail from '@/emails/AnnouncementEmail'
import { ReactElement } from 'react'
import { generateReceiptPDF, ReceiptData } from '@/lib/pdf-generator'
import { format } from 'date-fns'
import { render } from '@react-email/render'

// Helper function to send email via Resend or Nodemailer
async function sendEmail({
  to,
  subject,
  react,
  attachments
}: {
  to: string
  subject: string
  react: ReactElement
  attachments?: { filename: string; content: Buffer }[]
}) {
  if (useResend) {
    return resend.emails.send({
      from: EMAIL_SENDER,
      to,
      subject,
      react,
      attachments
    })
  } else {
    // Render React component to HTML
    const html = await render(react)
    
    // Send via Nodemailer
    const info = await transporter.sendMail({
      from: EMAIL_SENDER,
      to,
      subject,
      html,
      attachments: attachments?.map(att => ({
        filename: att.filename,
        content: att.content
      }))
    })

    return { data: info, error: null }
  }
}

export async function sendReceiptEmail(data: ReceiptData) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      console.warn('Neither RESEND_API_KEY nor SMTP_USER is set. Email sending skipped.')
      return { success: false, error: 'Email service not configured' }
    }

    if (!data.studentEmail) {
      return { success: false, error: 'Student email is missing' }
    }

    // Generate PDF
    let pdfBuffer: Buffer | undefined
    try {
      const arrayBuffer = generateReceiptPDF(data, 'arraybuffer') as ArrayBuffer
      if (arrayBuffer) {
        pdfBuffer = Buffer.from(arrayBuffer)
      }
    } catch (pdfError) {
      console.error('Failed to generate PDF for email:', pdfError)
      // Continue without PDF if generation fails
    }

    const emailProps = {
      studentName: data.studentName,
      amount: data.amount,
      date: format(data.date, 'dd MMM yyyy'),
      invoiceNo: data.invoiceNo,
      planName: data.planName,
      duration: data.planDuration || 'N/A',
      branchName: data.branchName,
      paymentMethod: data.paymentMethod
    }

    const { data: emailData, error } = await sendEmail({
      to: data.studentEmail,
      subject: `Payment Receipt - ${data.invoiceNo}`,
      react: ReceiptEmail(emailProps) as ReactElement,
      attachments: pdfBuffer ? [
        {
          filename: `Receipt-${data.invoiceNo}.pdf`,
          content: pdfBuffer
        }
      ] : undefined
    })

    if (error) {
      console.error('Failed to send receipt email:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error('Error sending receipt email:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function sendWelcomeEmail(data: {
  studentName: string
  studentEmail: string
  libraryName?: string
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      console.warn('Email service not configured.')
      return { success: false, error: 'Email service not configured' }
    }

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/login`

    const { data: emailData, error } = await sendEmail({
      to: data.studentEmail,
      subject: 'Welcome to Library App',
      react: WelcomeEmail({ 
        studentName: data.studentName, 
        studentEmail: data.studentEmail,
        loginUrl,
        libraryName: data.libraryName
      }) as ReactElement
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function sendSubscriptionExpiryEmail(data: {
  studentName: string
  studentEmail: string
  planName: string
  expiryDate: Date
  daysLeft: number
  branchName: string
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      console.warn('Email service not configured.')
      return { success: false, error: 'Email service not configured' }
    }

    const { data: emailData, error } = await sendEmail({
      to: data.studentEmail,
      subject: `Action Required: Subscription Expiring in ${data.daysLeft} Days`,
      react: SubscriptionExpiryEmail({
        studentName: data.studentName,
        planName: data.planName,
        expiryDate: format(data.expiryDate, 'dd MMM yyyy'),
        daysLeft: data.daysLeft,
        branchName: data.branchName,
        renewLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/payments`
      }) as ReactElement
    })

    if (error) {
      console.error('Failed to send expiry email:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error('Error sending expiry email:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function sendTicketUpdateEmail(data: {
  studentName: string
  studentEmail: string
  ticketId: string
  ticketSubject: string
  type: 'status_change' | 'new_comment' | 'created'
  status?: string
  updatedBy?: string
  comment?: string
  branchName?: string
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      console.warn('Email service not configured.')
      return { success: false, error: 'Email service not configured' }
    }

    const { data: emailData, error } = await sendEmail({
      to: data.studentEmail,
      subject: `Update on Ticket #${data.ticketId.slice(0, 8).toUpperCase()} - ${data.ticketSubject}`,
      react: TicketUpdateEmail({
        studentName: data.studentName,
        ticketId: data.ticketId,
        ticketSubject: data.ticketSubject,
        type: data.type,
        status: data.status,
        updatedBy: data.updatedBy,
        comment: data.comment,
        actionLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/issues/${data.ticketId}`,
        branchName: data.branchName
      }) as ReactElement
    })

    if (error) {
      console.error('Failed to send ticket update email:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error('Error sending ticket update email:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function sendPasswordResetEmail(data: {
  name: string
  email: string
  token: string
  libraryName?: string
  resetUrl?: string
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      console.warn('Email service not configured.')
      return { success: false, error: 'Email service not configured' }
    }

    const resetUrl = data.resetUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${data.token}`

    const { data: emailData, error } = await sendEmail({
      to: data.email,
      subject: 'Reset Your Password - BookMyLib',
      react: ResetPasswordEmail({
        userName: data.name,
        resetUrl,
        libraryName: data.libraryName
      }) as ReactElement
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function sendAnnouncementEmail(data: {
  email: string;
  title: string;
  content: string;
  libraryName: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      // console.warn('Email service not configured.')
      return { success: false, error: 'Email service not configured' }
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`

    const { data: emailData, error } = await sendEmail({
      to: data.email,
      subject: `New Announcement: ${data.title}`,
      react: AnnouncementEmail({
        title: data.title,
        content: data.content,
        libraryName: data.libraryName,
        portalUrl
      }) as ReactElement
    })

    if (error) {
      console.error('Failed to send announcement email:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error('Error sending announcement email:', error)
    return { success: false, error: 'Internal server error' }
  }
}
