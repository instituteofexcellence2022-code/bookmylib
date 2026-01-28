'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Shield, 
  Users, 
  LayoutDashboard, 
  QrCode, 
  History, 
  Search,
  BarChart3,
  CreditCard,
  Settings,
  Clock,
  UserCircle,
  Wallet,
  Lock,
  Scroll,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

type Role = 'owner' | 'staff' | 'student'

const roleConfig = {
  owner: {
    color: 'amber',
    title: 'Library Owner',
    headline: 'Manage Your Library Empire',
    subheadline: 'Complete control over branches, finances, and staff. The ultimate command center for modern libraries.',
    icon: Shield,
    features: [
      { icon: LayoutDashboard, title: 'Central Dashboard', desc: 'Real-time overview of all operations' },
      { icon: BarChart3, title: 'Advanced Analytics', desc: 'Track revenue, attendance, and growth' },
      { icon: Settings, title: 'Branch Management', desc: 'Manage multiple locations effortlessly' },
      { icon: Wallet, title: 'Finance Suite', desc: 'Automated billing, fines, and expense tracking' },
      { icon: Lock, title: 'Role-Based Access', desc: 'Secure permissions for different staff levels' },
      { icon: Scroll, title: 'Activity Audit', desc: 'Detailed logs of every action taken' }
    ],
    cta: {
      primary: { text: 'Start Free Trial', href: '/owner/register' },
      secondary: { text: 'Owner Login', href: '/owner/login' }
    }
  },
  staff: {
    color: 'emerald',
    title: 'Library Staff',
    headline: 'Streamline Daily Operations',
    subheadline: 'Efficient tools for student management, issue tracking, and attendance marking.',
    icon: Users,
    features: [
      { icon: QrCode, title: 'Quick Check-in', desc: 'Fast QR-based attendance system' },
      { icon: UserCircle, title: 'Student Profiles', desc: 'Access student records instantly' },
      { icon: Clock, title: 'Shift Management', desc: 'Track your work hours and tasks' }
    ],
    cta: {
      primary: { text: 'Staff Login', href: '/staff/login' },
      secondary: null
    }
  },
  student: {
    color: 'blue',
    title: 'Student',
    headline: 'Your Learning Sanctuary',
    subheadline: 'Find books, track your reading history, and manage your study schedule.',
    icon: BookOpen,
    features: [
      { icon: Search, title: 'Book Search', desc: 'Find availability in seconds' },
      { icon: History, title: 'Reading History', desc: 'Keep track of borrowed books' },
      { icon: CreditCard, title: 'Membership', desc: 'Manage your plan and payments' }
    ],
    cta: {
      primary: { text: 'Student Login', href: '/student/login' },
      secondary: null
    }
  }
}

export default function Home() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<Role>('student')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // This effect runs only once after the initial render to indicate the component has mounted.
    // It's used to prevent hydration mismatches for client-side only content.
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-500 overflow-hidden">
        {/* Render basic structure to match server output */}
        <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600">
                <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">
                BookMyLib
            </span>
            </div>
        </nav>
        <div className="flex justify-center pt-20">
             {/* Spinner or Skeleton */}
             <div className="animate-pulse w-32 h-8 bg-muted rounded-full"></div>
        </div>
      </div>
    )
  }

  const currentRole = roleConfig[activeRole]

  return (
    <div className="min-h-screen bg-background transition-colors duration-500 overflow-hidden selection:bg-purple-100 dark:selection:bg-purple-900/30">
      
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 transition-colors duration-700
          ${activeRole === 'owner' ? 'bg-amber-500' : activeRole === 'staff' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
        />
        <div className={`absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 transition-colors duration-700
          ${activeRole === 'owner' ? 'bg-blue-500' : activeRole === 'staff' ? 'bg-teal-500' : 'bg-cyan-500'}`} 
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl transition-colors duration-500
            ${activeRole === 'owner' ? 'bg-amber-600' : activeRole === 'staff' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            BookMyLib
          </span>
        </div>
        <ThemeToggle />
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20">
        
        {/* Role Toggle */}
        <div className="flex justify-center mb-16">
          <div className="p-1.5 bg-muted rounded-full flex gap-1 shadow-inner relative">
            {(['student', 'staff', 'owner'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 z-10 capitalize
                  ${activeRole === role 
                    ? 'text-white' 
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                {activeRole === role && (
                  <motion.div
                    layoutId="activeRole"
                    className={`absolute inset-0 rounded-full shadow-lg
                      ${role === 'owner' ? 'bg-rose-600' : role === 'staff' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative">{role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground">
                {currentRole.headline.split(' ').map((word, i) => (
                  <span key={i} className="block">{word} </span>
                ))}
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                {currentRole.subheadline}
              </p>

              <div className="flex items-center gap-4">
                {currentRole.cta.primary && (
                  <AnimatedButton
                    variant="primary"
                    onClick={() => router.push(currentRole.cta.primary.href)}
                    className={`h-10 px-6 shadow-xl shadow-current/20 border-transparent
                        ${activeRole === 'owner' 
                          ? 'bg-rose-600 hover:bg-rose-700' 
                          : activeRole === 'staff'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {currentRole.cta.primary.text}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </AnimatedButton>
                )}
                
                {currentRole.cta.secondary && (
                  <AnimatedButton
                    variant="outline"
                    onClick={() => currentRole.cta.secondary && router.push(currentRole.cta.secondary.href)}
                    className="h-10 px-6 text-sm bg-transparent border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    {currentRole.cta.secondary.text}
                  </AnimatedButton>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Feature Cards Preview */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className={currentRole.features.length > 3 ? "grid sm:grid-cols-2 gap-4" : "grid gap-6"}
              >
                {currentRole.features.map((feature, idx) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-6 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl
                        ${activeRole === 'owner' 
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                          : activeRole === 'staff'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}
                      >
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 border-t border-gray-100 dark:border-gray-900 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            © {new Date().getFullYear()} BookMyLib. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
