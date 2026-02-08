import React from 'react'
import { ScrollText, Mail, Shield, Scale, CreditCard, UserX, AlertTriangle } from 'lucide-react'
import { NavBackButton } from '@/components/ui/NavBackButton'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <NavBackButton />
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <ScrollText className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 space-y-10">
                    
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                            Welcome to BookMyLib. These Terms of Service ("Terms") govern your access to and use of the BookMyLib platform, including our website, mobile applications, and services (collectively, the "Service"). Please read these Terms carefully before using our Service.
                        </p>
                    </div>

                    <div className="grid gap-8">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Agreement to Terms</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service. This agreement applies to all visitors, users, and others who access or use the Service.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. User Accounts & Security</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li>You are responsible for safeguarding the password that you use to access the Service.</li>
                                    <li>You agree not to disclose your password to any third party.</li>
                                    <li>You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Payments, Refunds, and Cancellations</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p><strong>3.1 Subscription Plans:</strong> The Service is billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle").</p>
                                <p><strong>3.2 Fee Changes:</strong> BookMyLib, in its sole discretion and at any time, may modify the Subscription fees. Any Subscription fee change will become effective at the end of the then-current Billing Cycle.</p>
                                <p><strong>3.3 Refunds:</strong> Certain refund requests for Subscriptions may be considered by BookMyLib on a case-by-case basis and granted at the sole discretion of BookMyLib, typically only within 7 days of the initial purchase if no services were utilized.</p>
                                <p><strong>3.4 Cancellations:</strong> You may cancel your Subscription renewal either through your online account management page or by contacting our customer support team.</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <UserX className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Prohibited Conduct</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>You agree not to engage in any of the following prohibited activities:</p>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li>Copying, distributing, or disclosing any part of the Service in any medium.</li>
                                    <li>Using any automated system (robots, spiders, etc.) to access the Service.</li>
                                    <li>Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service.</li>
                                    <li>Taking any action that imposes, or may impose at our sole discretion an unreasonable or disproportionately large load on our infrastructure.</li>
                                    <li>Impersonating another person or otherwise misrepresenting your affiliation with a person or entity.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">5. Limitation of Liability</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    In no event shall BookMyLib, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Contact Us</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    If you have any questions about these Terms, please contact us at:
                                </p>
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg inline-block">
                                    <p className="font-semibold">BookMyLib Legal Team</p>
                                    <p>Email: studyspotindia@gmail.com</p>
                                    <p>Address: New Delhi, India</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
