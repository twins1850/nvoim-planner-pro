'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Calendar,
  BookOpen,
  Users,
  BarChart3 as BarChart,
  Settings,
  FolderOpen,
  BrainCircuit,
  FileText,
  Menu,
  X,
  ClipboardList,
  KeyRound
} from 'lucide-react';

const mainNavigationItems = [
  { 
    icon: Home, 
    label: '대시보드', 
    href: '/dashboard',
    color: 'text-blue-600'
  },
  { 
    icon: Users, 
    label: '학생', 
    href: '/dashboard/students',
    color: 'text-green-600'
  },
  { 
    icon: MessageSquare, 
    label: '메시지', 
    href: '/dashboard/messages',
    color: 'text-purple-600'
  },
  { 
    icon: BookOpen, 
    label: '숙제', 
    href: '/homework',
    color: 'text-orange-600'
  },
  { 
    icon: Menu, 
    label: '더보기', 
    href: '#more',
    color: 'text-gray-600'
  }
];

const moreMenuItems = [
  {
    icon: BookOpen,
    label: '수업 관리',
    href: '/dashboard/lessons',
    color: 'text-blue-500'
  },
  {
    icon: BrainCircuit,
    label: 'AI 피드백',
    href: '/dashboard/ai-feedback',
    color: 'text-purple-500'
  },
  {
    icon: Calendar,
    label: '일정 관리',
    href: '/dashboard/calendar',
    color: 'text-indigo-600'
  },
  {
    icon: FileText,
    label: '학습 자료',
    href: '/dashboard/materials',
    color: 'text-teal-600'
  },
  {
    icon: BarChart,
    label: '진도 분석',
    href: '/dashboard/analytics',
    color: 'text-pink-600'
  },
  {
    icon: Settings,
    label: '설정',
    href: '/dashboard/settings',
    color: 'text-gray-600'
  }
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {/* 상단 헤더 */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-lg font-bold text-gray-800">NVOIM Planner</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{pathname.split('/').pop()?.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      {/* 더보기 메뉴 모달 */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">더보기</h2>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setShowMoreMenu(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? item.color : ''}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {mainNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
                           (item.href !== '/dashboard' && item.href !== '#more' && pathname.startsWith(item.href));
            
            if (item.href === '#more') {
              return (
                <button
                  key={item.href}
                  onClick={() => setShowMoreMenu(true)}
                  className="flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-200 text-gray-500 hover:text-gray-700"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            }
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-200 ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? item.color : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 컨텐츠 여백을 위한 스페이서 */}
      <div className="h-16" /> {/* 상단 헤더 여백 */}
      <div className="h-20" /> {/* 하단 네비게이션 여백 */}
    </>
  );
}