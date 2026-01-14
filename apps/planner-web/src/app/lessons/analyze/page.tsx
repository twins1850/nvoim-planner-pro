'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload, Video, Loader2, CheckCircle, AlertCircle, FileVideo } from 'lucide-react';

export default function LessonAnalyzePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 타입 검증
      if (!file.type.startsWith('video/')) {
        setError('비디오 파일만 업로드할 수 있습니다.');
        return;
      }

      // 파일 크기 검증 (최대 500MB)
      const maxSizeMB = 500;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`파일 크기는 최대 ${maxSizeMB}MB까지 지원합니다.`);
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  }

  async function uploadAndAnalyze() {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setProcessingStatus('업로드 중...');

    try {
      // 0. 현재 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('사용자 인증 정보를 확인할 수 없습니다.');
      }

      // 1. API 키 확인
      const { data: apiKeys, error: apiKeyError } = await supabase
        .from('planner_api_keys')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (apiKeyError || !apiKeys || apiKeys.length === 0) {
        throw new Error('활성화된 API 키가 없습니다. 설정에서 API 키를 먼저 등록해주세요.');
      }

      // 2. Supabase Storage에 영상 업로드 (플래너 ID 폴더 구조 사용)
      const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/${fileName}`; // 플래너 ID 폴더 안에 저장

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setProcessingStatus('영상 정보 저장 중...');

      // 3. lesson_videos 테이블에 레코드 생성
      const { data: videoRecord, error: insertError } = await supabase
        .from('lesson_videos')
        .insert({
          video_title: selectedFile.name,
          original_filename: selectedFile.name,
          file_size_mb: Number((selectedFile.size / (1024 * 1024)).toFixed(2)),
          video_storage_path: uploadData.path,
          processing_status: 'uploaded'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProcessingStatus('분석 준비 중...');

      // 4. Edge Function 호출하여 분석 시작
      const { data, error: functionError } = await supabase.functions.invoke('analyze-lesson-video', {
        body: { videoId: videoRecord.id }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error('AI 분석 시작 실패: ' + functionError.message);
      }

      setProcessingStatus('분석 시작됨!');

      // 5. 분석 결과 페이지로 이동 (폴링으로 진행 상황 확인)
      setTimeout(() => {
        router.push(`/lessons/${videoRecord.id}`);
      }, 1000);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || '업로드 중 오류가 발생했습니다.');
      setProcessingStatus('');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          수업 영상 AI 분석
        </h1>
        <p className="text-gray-600">
          수업 영상을 업로드하면 AI가 자동으로 분석하여 학생의 강점, 약점, 추천 숙제를 제공합니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800">{error}</p>
            {error.includes('API 키') && (
              <button
                onClick={() => router.push('/settings/api-keys')}
                className="mt-2 text-sm text-blue-600 underline hover:text-blue-700"
              >
                API 키 설정하러 가기 →
              </button>
            )}
          </div>
        </div>
      )}

      {/* 업로드 영역 */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-8 mb-6">
        <div className="flex flex-col items-center justify-center">
          {!selectedFile ? (
            <>
              <FileVideo className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">수업 영상 파일을 선택하세요</p>
              <p className="text-sm text-gray-500 mb-4">최대 500MB까지 지원</p>
              <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors">
                <Upload className="w-5 h-5" />
                파일 선택
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
              <p className="text-gray-900 font-medium mb-2">{selectedFile.name}</p>
              <p className="text-gray-500 text-sm mb-4">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={uploading}
                >
                  다시 선택
                </button>
                <button
                  onClick={uploadAndAnalyze}
                  disabled={uploading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {processingStatus}
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      분석 시작
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 안내 사항 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          분석 프로세스
        </h3>
        <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
          <li>영상 파일 업로드 (최대 500MB)</li>
          <li>오디오 추출 및 파일 크기 축소</li>
          <li>첫 번째 AI 모델로 분석 (수업 요약, 전사)</li>
          <li>두 번째 AI 모델로 피드백 생성 (강점, 약점, 추천 숙제)</li>
          <li>분석 결과 저장 및 표시</li>
        </ol>
        <div className="space-y-1 text-sm text-amber-700">
          <p>• 25분 영상 기준 약 3-5분 소요됩니다.</p>
          <p>• API 키가 등록되어 있어야 분석이 가능합니다.</p>
          <p>• API 사용 비용은 직접 부담하게 됩니다.</p>
        </div>
      </div>

      {/* 정보 카드 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-1">빠른 분석</h4>
          <p className="text-sm text-blue-700">
            25분 영상을 보지 않고도 즉시 피드백을 받을 수 있습니다.
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-1">정확한 피드백</h4>
          <p className="text-sm text-purple-700">
            2개의 AI 모델이 협력하여 정확하고 상세한 분석을 제공합니다.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-1">추천 숙제</h4>
          <p className="text-sm text-green-700">
            학생의 약점을 보완할 수 있는 맞춤형 숙제를 자동으로 추천합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
