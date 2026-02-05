'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
    QrCode as QrCodeIcon, 
    Printer, 
    BookOpen, 
    MapPin, 
    Scan, 
    Search, 
    UserCheck, 
    Phone, 
    Mail 
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { getStaffBranchInfo } from '@/actions/staff/attendance'
import QRCode from 'qrcode'
import { toast } from 'sonner'

interface BranchInfo {
    id: string
    name: string
    qrCode?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    phone?: string | null
    email?: string | null
    owner?: {
        name: string
    } | null
}

export function StaffQRViewClient() {
    const [branch, setBranch] = useState<BranchInfo | null>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

    const fetchBranch = useCallback(async () => {
        try {
            const data = await getStaffBranchInfo()
            if (data) {
                // @ts-ignore - Ignoring strict type check for now as we updated the action return type
                setBranch(data)
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        fetchBranch()
    }, [fetchBranch])

    useEffect(() => {
        if (branch?.qrCode) {
             const baseUrl = window.location.origin
             const qrPayload = `${baseUrl}/discover/${branch.id}?qr_code=${branch.qrCode}`
             
             QRCode.toDataURL(qrPayload, {
                width: 600,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
             })
                .then(url => setQrDataUrl(url))
                .catch(err => console.error(err))
        } else {
            setQrDataUrl(null)
        }
    }, [branch])

    const handlePrintQR = () => {
        const printContent = document.getElementById('printable-qr-card');
        if (!printContent) {
            toast.error('Could not find QR code content to print');
            return;
        }
    
        const windowUrl = 'about:blank';
        const uniqueName = new Date().getTime();
        const windowName = 'Print' + uniqueName;
        const printWindow = window.open(windowUrl, windowName, 'width=800,height=600');
    
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${branch?.name || 'Branch'} - QR Poster</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  @page { size: A4 portrait; margin: 0; }
                  body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                  .print-container { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
                  
                  /* Force white background and high contrast text for print */
                  #printable-qr-card { 
                    background-color: white !important; 
                    color: black !important; 
                    box-shadow: none !important;
                    width: 100%;
                max-width: 140mm;
                border: 1px solid #e5e7eb;
                  }
    
                  /* Ensure text visibility */
                  .text-gray-400, .text-gray-500, .text-gray-600 {
                    color: #4b5563 !important; /* Make grays darker (gray-600) for print readability */
                  }
                  
                  /* Ensure truncated text wraps in print if needed */
                  .truncate {
                    white-space: normal !important;
                    overflow: visible !important;
                    text-overflow: clip !important;
                  }
                  
                  /* Reset background opacities for better print reproduction */
                  .bg-gray-50 { background-color: #f9fafb !important; }
                  .bg-blue-600 { background-color: #2563eb !important; color: white !important; }
                </style>
              </head>
              <body>
                <div class="print-container">
                    ${printContent.outerHTML}
                </div>
                <script>
                  window.onload = function() {
                    // Wait for Tailwind to process
                    setTimeout(function() {
                      window.focus();
                      window.print();
                      // Allow user to close or keep open
                    }, 1000);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
            toast.error('Pop-up blocked. Please allow pop-ups for this site to print.');
        }
      }

    if (!branch) return null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
             <div className="md:col-span-2 lg:col-span-1 mx-auto w-full max-w-md">
                <CompactCard>
                    <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-white dark:bg-gray-900 rounded-xl" id="printable-qr-card">
                       {/* 1. Header with Brand & Branch Info */}
                       <div className="w-full flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                           {/* Brand Logo */}
                           <div className="flex items-center gap-2">
                             <div className="p-2 rounded-xl bg-blue-600">
                               <BookOpen className="w-5 h-5 text-white" />
                             </div>
                             <span className="font-bold text-xl tracking-tighter text-gray-900 dark:text-white">
                               BookMy<span className="text-blue-600">Lib</span>
                             </span>
                           </div>

                           {/* Branch Info */}
                           <div className="text-right">
                               <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{branch.name}</h3>
                               <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                                   <MapPin className="w-3.5 h-3.5" />
                                   <span>{branch.city || 'Branch'}</span>
                               </div>
                           </div>
                       </div>
    
                       {/* 2. Main QR Section */}
                       <div className="flex flex-col items-center space-y-5 py-2">
                         <div className="relative group">
                            <div className="absolute -inset-1.5 bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-75 blur transition duration-1000 group-hover:duration-200 group-hover:opacity-100"></div>
                            <div className="relative p-6 bg-white rounded-xl shadow-xl">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="Branch QR" className="w-64 h-64 object-contain" />
                                ) : (
                                    <div className="w-64 h-64 flex items-center justify-center bg-gray-50 text-gray-400">
                                        <QrCodeIcon className="w-16 h-16" />
                                    </div>
                                )}
                            </div>
                         </div>
                         <div className="flex items-center gap-2 text-sm font-bold text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-5 py-2 rounded-full border border-purple-100 dark:border-purple-800">
                            <Scan className="w-4 h-4" />
                            <span>Scan Now</span>
                         </div>
                       </div>
    
                       {/* 3. Dual Instruction Section */}
                       <div className="grid grid-cols-2 gap-4 w-full">
                          {/* New Users */}
                          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-transparent border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all flex items-center gap-4 text-left">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100/50 dark:bg-blue-800/20 rounded-bl-full -mr-8 -mt-8"></div>
                            <div className="w-14 h-14 bg-white dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-50 dark:border-blue-800 shrink-0">
                                <Search className="w-7 h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm uppercase tracking-wide opacity-80">New Visitor?</h4>
                                <p className="text-lg font-bold text-blue-800 dark:text-blue-200 leading-tight mt-1">
                                    View details & Book seats
                                </p>
                            </div>
                          </div>
                          
                          {/* Existing Students */}
                          <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-transparent border border-green-100 dark:border-green-900/50 p-4 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all flex items-center gap-4 text-left">
                             <div className="absolute top-0 right-0 w-16 h-16 bg-green-100/50 dark:bg-green-800/20 rounded-bl-full -mr-8 -mt-8"></div>
                             <div className="w-14 h-14 bg-white dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 shadow-sm border border-green-50 dark:border-green-800 shrink-0">
                                <UserCheck className="w-7 h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-green-900 dark:text-green-300 text-sm uppercase tracking-wide opacity-80">Member?</h4>
                                <p className="text-lg font-bold text-green-800 dark:text-green-200 leading-tight mt-1">
                                    Mark Attendance (In/Out)
                                </p>
                            </div>
                          </div>
                       </div>
    
                       {/* 4. Footer Details */}
                       <div className="w-full pt-5 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          {(branch.owner?.name) && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <span className="text-gray-400 font-medium uppercase text-[10px] shrink-0">Owner</span>
                                <span className="font-semibold text-gray-900 dark:text-white truncate">{branch.owner.name}</span>
                            </div>
                          )}
                          {branch.phone && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-medium truncate">{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                 <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                 <span className="font-medium truncate">{branch.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-medium line-clamp-1">{[branch.address, branch.city, branch.state].filter(Boolean).join(', ')}</span>
                          </div>
                       </div>

                       {/* 5. Powered By Footer */}
                       <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Powered by BookMyLib</p>
                       </div>
                    </div>
    
                    {/* Actions below card */}
                    <div className="mt-6 flex gap-3">
                         {branch?.qrCode && (
                            <AnimatedButton 
                                variant="primary" 
                                className="w-full"
                                onClick={handlePrintQR}
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Save & Print
                            </AnimatedButton>
                         )}
                    </div>
                </CompactCard>
             </div>
 
             <CompactCard>
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Instructions</h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 font-bold">1</div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Print Poster</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Print this QR code and place it at the entrance or reception desk.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 font-bold">2</div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Student Scanning</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Students can use their mobile app to scan this QR code upon entry and exit.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 font-bold">3</div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Automatic Tracking</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Attendance is automatically recorded. Students must have an active subscription to check in.</p>
                            </div>
                        </div>
                    </div>
                </div>
             </CompactCard>
        </div>
    )
}
