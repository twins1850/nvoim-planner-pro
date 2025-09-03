'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import MainLayout from '@/components/layout/MainLayout'
import FileUpload from '@/components/upload/FileUpload'

interface TestUploadContentProps {
  user: User
  profile: any
}

export default function TestUploadContent({ user, profile }: TestUploadContentProps) {
  const [uploadResults, setUploadResults] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const handleUploadSuccess = (url: string, fileName: string) => {
    setUploadResults(prev => [...prev, `✅ ${fileName}: ${url}`])
  }

  const handleUploadError = (error: string) => {
    setErrors(prev => [...prev, `❌ ${error}`])
  }

  return (
    <MainLayout user={user} profile={profile}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            파일 업로드 테스트
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 일반 파일 업로드 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                일반 파일 (Public)
              </h2>
              <FileUpload
                bucket="general-files"
                folder="test-uploads"
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            {/* 숙제 파일 업로드 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                숙제 파일 (Private)
              </h2>
              <FileUpload
                bucket="homework-files"
                folder={`user-${user.id}`}
                allowedFileTypes={['audio/*', 'video/*', '.pdf', '.doc', '.docx']}
                maxFileSize={50}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          </div>

          {/* 업로드 결과 */}
          {(uploadResults.length > 0 || errors.length > 0) && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">업로드 결과</h3>
              
              {uploadResults.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">성공</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {uploadResults.map((result, index) => (
                      <li key={index} className="font-mono text-xs break-all">
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">오류</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  setUploadResults([])
                  setErrors([])
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                결과 지우기
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}