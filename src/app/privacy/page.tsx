import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Database, Eye, Share2, Lock, Cookie, FileText, UserCheck } from 'lucide-react'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link 
                        href="/student/register" 
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 space-y-10">
                    
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                            At BookMyLib, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
                        </p>
                    </div>

                    <div className="grid gap-8">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Information We Collect</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>We collect information that you voluntarily provide to us when you register on the Service, express an interest in obtaining information about us or our products and services, when you participate in activities on the Service, or otherwise when you contact us.</p>
                                <div className="mt-3 space-y-2">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Personal Data:</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Personally identifiable information, such as your name, shipping address, email address, and telephone number.</li>
                                        <li>Date of birth and other demographic information.</li>
                                        <li>Emergency contact or guardian information for students.</li>
                                    </ul>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Derivative Data:</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. How We Use Your Information</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:</p>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li>Create and manage your account.</li>
                                    <li>Process payments and refunds.</li>
                                    <li>Email you regarding your account or order.</li>
                                    <li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
                                    <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
                                    <li>Notify you of updates to the Site, terms, and policies.</li>
                                    <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Disclosure of Your Information</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
                                    <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
                                    <li><strong>Library Partners:</strong> We share necessary student data with the specific library branches where you have active subscriptions for attendance and management purposes.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Data Security</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">5. Your Data Rights</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>Depending on your location, you may have the following rights regarding your personal data:</p>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li><strong>Right to Access:</strong> You have the right to request copies of your personal data.</li>
                                    <li><strong>Right to Rectification:</strong> You have the right to request that we correct any information you believe is inaccurate.</li>
                                    <li><strong>Right to Erasure:</strong> You have the right to request that we erase your personal data, under certain conditions.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Cookie className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Cookie Policy</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">7. Contact Us</h2>
                            </div>
                            <div className="pl-9 text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                                <p>
                                    If you have questions or comments about this Privacy Policy, please contact us at:
                                </p>
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg inline-block">
                                    <p className="font-semibold">BookMyLib Privacy Officer</p>
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
