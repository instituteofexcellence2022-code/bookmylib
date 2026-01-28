import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ReceiptPayment {
  id: string
  invoiceNumber?: string
  description?: string | null
  amount: number
  currency?: string
  discountAmount?: number
  date: Date | string
  createdAt: Date | string
  method: string
  status: string
  reference?: string
  student: {
    name: string
    email: string
    phone?: string | null
  }
  library?: {
    name: string
    contactEmail?: string | null
    contactPhone?: string | null
    address?: string | null
  }
  branch?: {
    name: string
    address?: string
  }
  subscription?: {
    plan: {
      name: string
      price: number
      duration?: number
      durationUnit?: string
    }
    startDate: Date | string
    endDate: Date | string
    seat?: {
      number: string
      section?: string | null
    }
  }
  additionalFee?: {
    name: string
    amount: number
  }
  promotion?: {
    code: string
    discountAmount: number
  }
}

export const generateReceipt = (payment: ReceiptPayment): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Colors
  const PRIMARY_COLOR = [124, 58, 237] as [number, number, number] // Purple-600
  const SECONDARY_COLOR = [243, 232, 255] as [number, number, number] // Purple-100
  const TEXT_COLOR = [31, 41, 55] as [number, number, number] // Gray-800
  const LIGHT_TEXT_COLOR = [107, 114, 128] as [number, number, number] // Gray-500

  // --- Header Background ---
  doc.setFillColor(...PRIMARY_COLOR)
  doc.rect(0, 0, 210, 40, 'F')

  // --- Header Text ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(255, 255, 255)
  doc.text('RECEIPT', 180, 28, { align: 'right' })

  // Library Name (White on Purple)
  const libraryName = payment.library?.name || 'Library Management System'
  doc.setFontSize(18)
  doc.text(libraryName, 20, 20)

  // Library Contact (White, smaller)
  const libraryContact = [payment.library?.contactEmail, payment.library?.contactPhone].filter(Boolean).join(' | ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(230, 230, 230)
  if (payment.library?.address) {
    doc.text(payment.library.address, 20, 28)
  }
  if (libraryContact) {
    doc.text(libraryContact, 20, 34)
  }

  // --- Info Section ---
  const startY = 60
  
  // Left Column: Bill To
  doc.setTextColor(...PRIMARY_COLOR)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', 20, startY)

  doc.setTextColor(...TEXT_COLOR)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(payment.student?.name || 'Student', 20, startY + 8)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...LIGHT_TEXT_COLOR)
  doc.text(payment.student?.email || '', 20, startY + 14)
  if (payment.branch?.name) {
    doc.text(payment.branch.name, 20, startY + 20)
  }

  // Right Column: Payment Details
  doc.setTextColor(...PRIMARY_COLOR)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT DETAILS', 120, startY)

  const details = [
    { label: 'Receipt No:', value: payment.invoiceNumber || `#${payment.id.substring(0, 8).toUpperCase()}` },
    { label: 'Date:', value: new Date(payment.createdAt).toLocaleDateString() },
    { label: 'Time:', value: new Date(payment.createdAt).toLocaleTimeString() },
    { label: 'Status:', value: payment.status.toUpperCase() },
    { label: 'Method:', value: (payment.method || 'Online').replace('_', ' ').toUpperCase() }
  ]

  let detailY = startY + 8
  details.forEach(detail => {
    doc.setTextColor(...LIGHT_TEXT_COLOR)
    doc.setFont('helvetica', 'normal')
    doc.text(detail.label, 120, detailY)
    
    doc.setTextColor(...TEXT_COLOR)
    doc.setFont('helvetica', 'bold')
    doc.text(detail.value, 160, detailY)
    
    detailY += 6
  })

  // --- Table ---
  // Prepare body data with detailed description
  let description = payment.description || 'Subscription Payment'
  
  if (payment.subscription) {
    const sub = payment.subscription
    const planName = sub.plan?.name || 'Unknown Plan'
    const duration = sub.plan?.duration ? `${sub.plan.duration} ${sub.plan.durationUnit}` : ''
    const startDate = new Date(sub.startDate).toLocaleDateString()
    const endDate = new Date(sub.endDate).toLocaleDateString()
    const seatInfo = sub.seat ? `Seat: S-${String(sub.seat.number).padStart(2, '0')} ${sub.seat.section ? `(${sub.seat.section})` : ''}` : ''

    description = `${planName} (${duration})\nPeriod: ${startDate} - ${endDate}`
    if (seatInfo) {
      description += `\n${seatInfo}`
    }
    if (payment.branch?.name) {
      description += `\nBranch: ${payment.branch.name}`
    }
  }

  // Add discount row if exists (display only)
  const currency = payment.currency || '₹'
  const discount = payment.discountAmount || 0

  const bodyData = [
    [
      description,
      `${currency} ${payment.amount.toFixed(2)}`
    ]
  ]

  if (discount > 0) {
     bodyData.push([
        'Discount Applied',
        `-${currency} ${discount.toFixed(2)}`
     ])
  }

  // Footer row
  const totalAmount = `${currency} ${payment.amount.toFixed(2)}`

  autoTable(doc, {
    startY: detailY + 15,
    head: [['Description', 'Amount']],
    body: bodyData,
    foot: [['Total', totalAmount]],
    theme: 'grid',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 4
    },
    bodyStyles: {
      textColor: TEXT_COLOR,
      cellPadding: 4,
      valign: 'middle'
    },
    footStyles: {
      fillColor: SECONDARY_COLOR,
      textColor: PRIMARY_COLOR,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'right', valign: 'middle' }
    },
    styles: {
      lineColor: [229, 231, 235], // Gray-200
      lineWidth: 0.1
    }
  })

  // --- Footer ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 30
  
  doc.setDrawColor(...PRIMARY_COLOR)
  doc.setLineWidth(0.5)
  doc.line(20, finalY, 190, finalY)

  doc.setTextColor(...PRIMARY_COLOR)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 105, finalY + 10, { align: 'center' })

  doc.setTextColor(...LIGHT_TEXT_COLOR)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('If you have any questions about this receipt, please contact support.', 105, finalY + 16, { align: 'center' })

  // Save
  doc.save(`Receipt-${payment.invoiceNumber || payment.id.substring(0, 8)}.pdf`)
}
