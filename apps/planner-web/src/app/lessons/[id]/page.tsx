'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Video,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText
} from 'lucide-react';

interface LessonVideo {
  id: string;
  video_title: string;
  processing_status: string;
  error_message: string | null;
  created_at: string;
  file_size_mb: number;
  video_duration_seconds: number | null;
}

interface LessonAnalysis {
  id: string;
  lesson_summary: string;
  student_strengths: string[];
  student_weaknesses: string[];
  recommended_homework: {
    title: string;
    description: string;
    difficulty: string;
    focus_areas: string[];
  };
  transcript: string | null;
  analysis_model_1: string;
  analysis_model_2: string;
  api_1_tokens_used: number;
  api_2_tokens_used: number;
  estimated_cost_usd: number;
  created_at: string;
}

export default function LessonResultPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<LessonVideo | null>(null);
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();

    // 처리 중인 경우 5초마다 폴링
    const interval = setInterval(() => {
      if (video && ['uploaded', 'extracting_audio', 'compressing', 'analyzing'].includes(video.processing_status)) {
        loadData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videoId]);

  async function loadData() {
    try {
      // 비디오 정보 로드
      const { data: videoData, error: videoError } = await supabase
        .from('lesson_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      setVideo(videoData as LessonVideo);

      // 분석 결과 로드 (완료된 경우에만)
      if (videoData.processing_status === 'completed') {
        const { data: analysisData, error: analysisError } = await supabase
          .from('ai_lesson_analyses')
          .select('*')
          .eq('lesson_video_id', videoId)
          .single();

        if (analysisError) {
          console.error('Analysis load error:', analysisError);
        } else {
          setAnalysis(analysisData as LessonAnalysis);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Load error:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }

  async function createHomeworkFromRecommendation() {
    if (!analysis?.recommended_homework) return;

    const { title, description, difficulty, focus_areas } = analysis.recommended_homework;

    try {
      // homework 테이블에 추가
      const { error } = await supabase
        .from('homework')
        .insert({
          title,
          description,
          difficulty,
          resources: { focus_areas }
        });

      if (error) throw error;

      alert('추천 숙제가 성공적으로 생성되었습니다!');
      router.push('/homework');
    } catch (err: any) {
      console.error('Homework creation error:', err);
      alert('숙제 생성 중 오류가 발생했습니다.');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error || '비디오를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  // 처리 중 상태
  if (['uploaded', 'extracting_audio', 'compressing', 'analyzing'].includes(video.processing_status)) {
    const statusMessages = {
      uploaded: '업로드 완료. 분석 대기 중...',
      extracting_audio: '비디오에서 오디오를 추출하는 중...',
      compressing: '오디오 파일을 압축하는 중...',
      analyzing: 'AI가 수업 내용을 분석하는 중...'
    };

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">분석 진행 중</h2>
            <p className="text-gray-600 mb-4">
              {statusMessages[video.processing_status as keyof typeof statusMessages]}
            </p>
            <p className="text-sm text-gray-500">
              25분 영상 기준 약 3-5분 소요됩니다. 이 페이지는 자동으로 새로고침됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 실패 상태
  if (video.processing_status === 'failed') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-900 mb-2">분석 실패</h2>
              <p className="text-sm text-red-800 mb-4">
                {video.error_message || '알 수 없는 오류가 발생했습니다.'}
              </p>
              <button
                onClick={() => router.push('/lessons/analyze')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                새 영상 업로드
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 분석 완료 - 결과 표시
  if (!analysis) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">분석이 완료되었지만 결과를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">{video.video_title}</h1>
            </div>
            <p className="text-sm text-gray-600">
              분석 완료: {new Date(analysis.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
      </div>

      {/* 수업 요약 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">수업 요약</h2>
        </div>
        <p className="text-gray-700 leading-relaxed">{analysis.lesson_summary}</p>
      </div>

      {/* 강점과 약점 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 강점 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">학생 강점</h3>
          </div>
          <ul className="space-y-2">
            {analysis.student_strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-green-800">
                <span className="text-green-600 mt-1">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 약점 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-amber-900">개선 필요 영역</h3>
          </div>
          <ul className="space-y-2">
            {analysis.student_weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start gap-2 text-amber-800">
                <span className="text-amber-600 mt-1">→</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 추천 숙제 */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-purple-900">추천 숙제</h3>
          </div>
          <button
            onClick={createHomeworkFromRecommendation}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
          >
            숙제로 추가
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">
              {analysis.recommended_homework.title}
            </h4>
            <p className="text-purple-800 text-sm mb-2">
              {analysis.recommended_homework.description}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
              난이도: {analysis.recommended_homework.difficulty}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-purple-700">집중 영역:</span>
              {analysis.recommended_homework.focus_areas.map((area, index) => (
                <span key={index} className="px-2 py-1 bg-white text-purple-800 rounded text-xs">
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 전사 내용 (접기/펼치기) */}
      {analysis.transcript && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">대화 전사 내용</h3>
            </div>
            {showTranscript ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
          {showTranscript && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.transcript}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 분석 정보 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">분석 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">전사 모델</p>
            <p className="font-medium text-gray-900">{analysis.analysis_model_1}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">분석 모델</p>
            <p className="font-medium text-gray-900">{analysis.analysis_model_2}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              총 토큰
            </p>
            <p className="font-medium text-gray-900">
              {(analysis.api_1_tokens_used + analysis.api_2_tokens_used).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              예상 비용
            </p>
            <p className="font-medium text-gray-900">
              ${analysis.estimated_cost_usd.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/lessons/analyze')}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          새 영상 분석
        </button>
        <button
          onClick={() => router.push('/homework')}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          숙제 관리로 이동
        </button>
      </div>
    </div>
  );
}
