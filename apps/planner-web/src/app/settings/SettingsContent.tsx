'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import MainLayout from '@/components/layout/MainLayout'
import {
  User as UserIcon,
  Mail,
  Phone,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Camera,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react'

interface SettingsContentProps {
  user: User
  profile: any
}

export default function SettingsContent({ user, profile }: SettingsContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    bio: '', // bio 필드는 데이터베이스에 없으므로 비워둠
    notifications_email: true, // 기본값 사용
    notifications_push: true, // 기본값 사용
    language: 'ko', // 기본값 사용
    timezone: 'Asia/Seoul' // 기본값 사용
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setSaving] = useState(false)

  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)
    try {
      // profiles 테이블에 실제 존재하는 컬럼만 업데이트
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone
          // bio와 preferences는 테이블에 존재하지 않으므로 제외
        })
        .eq('id', user.id)
        
      if (error) throw error
      
      alert('설정이 저장되었습니다.')
    } catch (error) {
      console.error('설정 저장 오류:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', name: '프로필', icon: UserIcon },
    { id: 'notifications', name: '알림', icon: Bell },
    { id: 'security', name: '보안', icon: Shield },
    { id: 'devices', name: '디바이스 관리', icon: Smartphone, isLink: true },
    { id: 'preferences', name: '환경설정', icon: Palette }
  ]

  const handleTabClick = (tabId: string, isLink?: boolean) => {
    if (isLink && tabId === 'devices') {
      router.push('/settings/devices')
    } else {
      setActiveTab(tabId)
    }
  }

  return (
    <MainLayout user={user} profile={profile}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="mt-1 text-sm text-gray-600">
            계정 설정과 환경설정을 관리하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id, tab.isLink)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          activeTab === tab.id
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {tab.name}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-6">프로필 정보</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-8 w-8 text-indigo-600" />
                          </div>
                          <button className="absolute bottom-0 right-0 h-6 w-6 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200">
                            <Camera className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{formData.full_name || '이름 없음'}</h4>
                          <p className="text-sm text-gray-500">{formData.email}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                          <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">자기소개</label>
                        <textarea
                          rows={3}
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="간단한 자기소개를 작성해주세요..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-6">알림 설정</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">이메일 알림</h4>
                          <p className="text-sm text-gray-500">수업, 숙제 관련 알림을 이메일로 받습니다.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.notifications_email}
                            onChange={(e) => setFormData({ ...formData, notifications_email: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">푸시 알림</h4>
                          <p className="text-sm text-gray-500">모바일 앱으로 알림을 받습니다.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.notifications_push}
                            onChange={(e) => setFormData({ ...formData, notifications_push: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-6">보안 설정</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">비밀번호 변경</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                                placeholder="현재 비밀번호를 입력하세요"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="새 비밀번호를 입력하세요"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="비밀번호를 다시 입력하세요"
                            />
                          </div>
                          
                          <button
                            type="button"
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                          >
                            비밀번호 변경
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-6">환경설정</h3>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">언어</label>
                          <select
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">시간대</label>
                          <select
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="Asia/Seoul">서울 (UTC+9)</option>
                            <option value="America/New_York">뉴욕 (UTC-5)</option>
                            <option value="Europe/London">런던 (UTC+0)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? '저장 중...' : '설정 저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}