import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

interface ReceiptData {
    invoiceNo: string
    date: Date
    studentName: string
    studentEmail?: string | null
    studentPhone?: string | null
    branchName: string
    branchAddress?: string | null
    planName: string
    planType?: string | null
    planDuration?: string | null
    planHours?: string | null
    seatNumber?: string | null
    startDate?: Date
    endDate?: Date
    amount: number
    paymentMethod: string
    subTotal: number
    discount: number
    items: Array<{
        description: string
        amount: number
    }>
}

export const generateReceiptPDF = (data: ReceiptData, action: 'download' | 'blob' = 'download'): Blob | void => {
    const doc = new jsPDF()
    
    // Define colors
    const primaryColor = [37, 99, 235] // Blue-600
    const grayColor = [107, 114, 128] // Gray-500
    
    // Define layout constants
    const margin = 14
    const rightMargin = 30 // Increased right margin significantly to avoid border issues
    const pageWidth = 210
    const rightX = pageWidth - rightMargin // 190

    // --- Header Section ---
    // Left side: Company Brand
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('BookMyLib', margin, 20)
    
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Your Premium Library Experience', margin, 25)
    
    // Right side: Invoice Label
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('RECEIPT', rightX, 20, { align: 'right' })
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`No: ${data.invoiceNo}`, rightX, 25, { align: 'right' })
    doc.text(`Date: ${formatDate(data.date)}`, rightX, 29, { align: 'right' })
    
    // Divider
    doc.setDrawColor(229, 231, 235) // Gray-200
    doc.line(margin, 34, rightX, 34)
    
    // --- Info Section ---
    const startY = 42
    const lineHeight = 5
    
    // Left: Billed To (Student)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Billed To:', margin, startY)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text(data.studentName, margin, startY + lineHeight)
    let leftY = startY + lineHeight
    if (data.studentEmail) {
        leftY += lineHeight
        doc.text(data.studentEmail, margin, leftY)
    }
    if (data.studentPhone) {
        leftY += lineHeight
        doc.text(data.studentPhone, margin, leftY)
    }
    
    // Right: Branch Details
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Branch:', rightX, startY, { align: 'right' })
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text(data.branchName, rightX, startY + lineHeight, { align: 'right' })
    let rightY = startY + lineHeight
    if (data.branchAddress) {
        rightY += lineHeight
        const splitAddress = doc.splitTextToSize(data.branchAddress, 60)
        doc.text(splitAddress, rightX, rightY, { align: 'right' })
        rightY += (splitAddress.length - 1) * lineHeight
    }
    
    // Determine max Y for next section
    const nextY = Math.max(leftY, rightY) + 10
    
    // --- Subscription Details Section ---
    const detailsY = nextY
    const boxHeight = 28
    const boxWidth = rightX - margin // Width based on margins
    
    doc.setFillColor(249, 250, 251) // Gray-50
    doc.roundedRect(margin, detailsY, boxWidth, boxHeight, 2, 2, 'F')
    
    doc.setFontSize(9)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    
    // Headers
    const headerY = detailsY + 7
    doc.text('Plan Details', 20, headerY)
    doc.text('Duration', 90, headerY)
    doc.text('Seat Info', 150, headerY)
    
    // Values
    const valueY = headerY + 7
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    
    // Plan Column
    doc.text(data.planName, 20, valueY)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    let planExtraY = valueY
    if (data.planType) {
        planExtraY += 5
        doc.text(data.planType, 20, planExtraY)
    }
    if (data.planHours) {
        planExtraY += 4 // Tighter spacing
        doc.text(data.planHours, 20, planExtraY)
    }

    // Duration Column
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    
    if (data.startDate && data.endDate) {
         doc.text(`${formatDate(data.startDate)} -`, 90, valueY)
         doc.text(`${formatDate(data.endDate)}`, 90, valueY + 5)
    } else if (data.planDuration) {
        doc.text(data.planDuration, 90, valueY)
    }

    // Seat Column
    if (data.seatNumber) {
        doc.text(data.seatNumber, 150, valueY)
    }

    // --- Table Section ---
    const tableData = data.items.map(item => [
        item.description,
        formatCurrency(item.amount)
    ])
    
    autoTable(doc, {
        startY: detailsY + boxHeight + 8,
        head: [['Description', 'Amount']],
        body: tableData,
        theme: 'plain',
        tableWidth: pageWidth - margin - rightMargin, // Explicitly constrain table width
        headStyles: { 
            fillColor: [249, 250, 251], // Gray-50
            textColor: [55, 65, 81], // Gray-700
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Description
            1: { cellWidth: 40, halign: 'right' } // Amount - Reduced width slightly
        },
        styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [229, 231, 235], // Gray-200
            lineWidth: { bottom: 0.1 }
        },
        margin: { left: margin, right: rightMargin }
    })
    
    // --- Summary Section ---
    // @ts-expect-error lastAutoTable exists on doc but is not typed
    const finalY = doc.lastAutoTable.finalY + 8
    
    const summaryX = 120
    const valueX = rightX
    
    doc.setFontSize(9)
    
    // Subtotal
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text('Subtotal:', summaryX, finalY)
    doc.setTextColor(0, 0, 0)
    doc.text(formatCurrency(data.subTotal), valueX, finalY, { align: 'right' })
    
    // Discount
    let currentY = finalY
    if (data.discount > 0) {
        currentY += 5
        doc.setTextColor(220, 38, 38) // Red
        doc.text('Discount:', summaryX, currentY)
        doc.text(`-${formatCurrency(data.discount)}`, valueX, currentY, { align: 'right' })
    }
    
    // Divider line for total
    currentY += 5
    doc.setDrawColor(229, 231, 235)
    doc.line(summaryX, currentY - 2, rightX, currentY - 2)
    
    // Total
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Total Paid:', summaryX, currentY + 3)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(formatCurrency(data.amount), valueX, currentY + 3, { align: 'right' })
    
    // --- Payment Details & Footer ---
    const footerY = currentY + 15
    
    // Payment Method Badge
    doc.setFillColor(243, 244, 246)
    doc.roundedRect(margin, footerY, 90, 20, 2, 2, 'F')
    
    doc.setFontSize(8)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setFont('helvetica', 'normal')
    doc.text('Payment Method', margin + 6, footerY + 7)
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(data.paymentMethod.toUpperCase(), margin + 6, footerY + 15)
    
    // Bottom Footer
    
    doc.setFontSize(8)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setFont('helvetica', 'normal')
    doc.text('Thank you for choosing BookMyLib.', 105, 280, { align: 'center' })
    doc.text('This is a computer generated receipt.', 105, 284, { align: 'center' })

    // Save or Return Blob
    if (action === 'blob') {
        return doc.output('blob')
    } else {
        doc.save(`Receipt-${data.invoiceNo}.pdf`)
    }
}
