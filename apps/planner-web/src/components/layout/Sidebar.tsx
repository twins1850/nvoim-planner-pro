'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  BarChart,
  BrainCircuit,
  Shield,
  KeyRound
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const baseNavigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '학생 관리', href: '/dashboard/students', icon: Users },
  { name: '수업 관리', href: '/dashboard/lessons', icon: BookOpen },
  { name: '숙제 관리', href: '/dashboard/homework', icon: ClipboardList },
  { name: 'AI 피드백', href: '/dashboard/ai-feedback', icon: BrainCircuit },
  { name: '일정 관리', href: '/dashboard/calendar', icon: Calendar },
  { name: '메시지', href: '/dashboard/messages', icon: MessageSquare },
  { name: '학습 자료', href: '/dashboard/materials', icon: FileText },
  { name: '진도 분석', href: '/dashboard/analytics', icon: BarChart },
  { name: '내 라이선스', href: '/license', icon: Shield },
  { name: '구독 설정', href: '/dashboard/settings/subscription', icon: Settings },
]

const adminNavigation = [
  { name: '라이선스 관리', href: '/admin/licenses', icon: KeyRound, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function getUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setUserRole(profile?.role || null)
      }
    }

    getUserRole()
  }, [])

  // Combine navigation arrays and filter based on user role
  const navigation = [
    ...baseNavigation,
    ...(userRole === 'admin' ? adminNavigation : [])
  ]

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h2 className="text-xl font-semibold text-white">NVOIM Planner</h2>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}