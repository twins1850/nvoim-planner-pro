'use client';

import Navigation from './Navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-col min-h-screen">
        {/* 상단 여백 */}
        <div className="h-16" />
        
        {/* 페이지 제목 (선택적) */}
        {title && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>
        )}
        
        {/* 메인 컨텐츠 */}
        <main className="flex-1 pb-20">
          {children}
        </main>
        
        {/* 하단 여백 */}
        <div className="h-20" />
      </div>
    </div>
  );
}