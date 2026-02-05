import { EmailVerificationEmail } from '@/emails/EmailVerificationEmail'
import { render } from '@react-email/render'

export default async function EmailPreviewPage() {
  const html = await render(
    <EmailVerificationEmail 
      userName="John Doe" 
      otp="123456" 
      libraryName="Central Library" 
    />
  )
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Email Verification Template Preview</h1>
      <div className="w-full max-w-[700px] bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 text-sm text-gray-500 flex justify-between items-center">
           <div className="flex gap-4">
             <span className="font-medium text-gray-700">To:</span> 
             <span>John Doe &lt;john@example.com&gt;</span>
           </div>
           <div className="flex gap-4">
             <span className="font-medium text-gray-700">Subject:</span>
             <span>Verify your email for Central Library</span>
           </div>
        </div>
        <iframe 
          srcDoc={html} 
          className="w-full h-[600px] border-none bg-white"
          title="Email Preview"
        />
      </div>
    </div>
  )
}
