'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home,
  Users, 
  BookOpen, 
  ClipboardList, 
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  BarChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '학생 관리', href: '/students', icon: Users },
  { name: '수업 관리', href: '/lessons', icon: BookOpen },
  { name: '숙제 관리', href: '/homework', icon: ClipboardList },
  { name: '일정 관리', href: '/calendar', icon: Calendar },
  { name: '메시지', href: '/messages', icon: MessageSquare },
  { name: '학습 자료', href: '/materials', icon: FileText },
  { name: '진도 분석', href: '/analytics', icon: BarChart },
  { name: '설정', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

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