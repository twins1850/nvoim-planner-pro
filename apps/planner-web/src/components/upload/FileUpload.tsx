'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, File, X, Check } from 'lucide-react'

interface FileUploadProps {
  bucket: string
  folder?: string
  allowedFileTypes?: string[]
  maxFileSize?: number // MB
  onUploadSuccess?: (url: string, fileName: string) => void
  onUploadError?: (error: string) => void
  className?: string
}

export default function FileUpload({
  bucket,
  folder = '',
  allowedFileTypes = ['image/*', 'audio/*', 'video/*', '.pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 10,
  onUploadSuccess,
  onUploadError,
  className = ''
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)

      // 파일 크기 검증
      if (file.size > maxFileSize * 1024 * 1024) {
        throw new Error(`파일 크기는 ${maxFileSize}MB 이하여야 합니다`)
      }

      // 파일 이름 생성 (중복 방지)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (error) {
        throw error
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      const publicUrl = urlData.publicUrl
      setUploadedFiles(prev => [...prev, publicUrl])
      onUploadSuccess?.(publicUrl, file.name)

    } catch (error: any) {
      console.error('업로드 오류:', error)
      onUploadError?.(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      await uploadFile(file)
    }

    // 입력값 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files

    for (const file of Array.from(files)) {
      await uploadFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const removeFile = (fileUrl: string) => {
    setUploadedFiles(prev => prev.filter(url => url !== fileUrl))
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 드래그 앤 드롭 영역 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            파일을 드래그하여 놓거나 <span className="text-indigo-600 font-medium">클릭하여 선택</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            최대 {maxFileSize}MB, {allowedFileTypes.join(', ')} 파일 지원
          </p>
        </div>
        {uploading && (
          <div className="mt-4">
            <div className="inline-flex items-center px-4 py-2 bg-indigo-100 rounded-md">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              <span className="text-sm text-indigo-700">업로드 중...</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedFileTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">업로드된 파일</h4>
          {uploadedFiles.map((fileUrl, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <File className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {fileUrl.split('/').pop()?.split('_').slice(1).join('_')}
                </span>
              </div>
              <button
                onClick={() => removeFile(fileUrl)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}