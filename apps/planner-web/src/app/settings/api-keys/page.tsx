'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Key, Plus, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

interface ApiKey {
  id: string;
  api_key_type: string;
  key_name: string;
  is_active: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const [newKey, setNewKey] = useState({
    keyType: 'openai',
    keyName: '',
    apiKey: ''
  });

  // API 키 목록 로드
  useEffect(() => {
    loadApiKeys();
  }, []);

  async function loadApiKeys() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planner_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err: any) {
      setError('API 키 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('Load API keys error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addApiKey() {
    if (!newKey.keyName.trim() || !newKey.apiKey.trim()) {
      setError('키 이름과 API 키를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Step 1: Get current user session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('인증 세션이 없습니다. 다시 로그인해주세요.');
      }

      // Step 2: Call Edge Function to encrypt API key
      const { data: encryptResult, error: encryptError } = await supabase.functions.invoke(
        'manage-api-keys',
        {
          body: {
            action: 'encrypt',
            apiKey: newKey.apiKey
          }
        }
      );

      if (encryptError) {
        throw new Error(`암호화 실패: ${encryptError.message}`);
      }

      if (!encryptResult || !encryptResult.encryptedKey || !encryptResult.iv) {
        throw new Error('암호화된 키를 받지 못했습니다.');
      }

      // Step 3: Store encrypted API key and IV in database
      const { error: insertError } = await supabase
        .from('planner_api_keys')
        .insert({
          api_key_type: newKey.keyType,
          key_name: newKey.keyName,
          encrypted_api_key: encryptResult.encryptedKey,
          encryption_iv: encryptResult.iv,
          is_active: true
        });

      if (insertError) throw insertError;

      await loadApiKeys();
      setShowNewKeyModal(false);
      setNewKey({ keyType: 'openai', keyName: '', apiKey: '' });
    } catch (err: any) {
      setError('API 키 추가 중 오류가 발생했습니다: ' + err.message);
      console.error('Add API key error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteApiKey(keyId: string) {
    if (!confirm('이 API 키를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('planner_api_keys')
        .delete()
        .eq('id', keyId);

      if (deleteError) throw deleteError;

      await loadApiKeys();
    } catch (err: any) {
      setError('API 키 삭제 중 오류가 발생했습니다.');
      console.error('Delete API key error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI API 키 관리
        </h1>
        <p className="text-gray-600">
          수업 영상 분석에 사용할 AI API 키를 등록하고 관리하세요.
          API 사용 비용은 직접 부담하게 됩니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* API 키 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">등록된 API 키</h2>
          <button
            onClick={() => setShowNewKeyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            새 키 추가
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {loading && apiKeys.length === 0 ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              등록된 API 키가 없습니다. 새 키를 추가해주세요.
            </div>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{key.key_name}</p>
                    <p className="text-sm text-gray-500 capitalize">{key.api_key_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    key.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {key.is_active ? '활성' : '비활성'}
                  </span>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 사용 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          필수 API 키 안내
        </h3>
        <div className="bg-white rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 mb-2">
            <strong>학생 음성 숙제 기능</strong>을 사용하려면 다음 2개의 API 키가 필요합니다:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• <strong>OpenAI API 키</strong>: AI 피드백 생성에 사용</li>
            <li>• <strong>Azure Speech API 키</strong>: 음성을 텍스트로 변환</li>
          </ul>
        </div>
        <p className="text-sm text-blue-700">
          ⚠️ <strong>비용 안내:</strong> API 사용량에 따라 각 플래너에게 직접 비용이 청구됩니다.
        </p>
      </div>

      {/* API 키 발급 상세 안내 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">📝 API 키 발급 방법 (상세 안내)</h3>

        {/* OpenAI */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">1. OpenAI API 키</h4>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">발급 절차:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><a href="https://platform.openai.com/signup" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenAI 계정 생성</a> (이미 있다면 로그인)</li>
                <li><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">API Keys 페이지</a>로 이동</li>
                <li>"Create new secret key" 버튼 클릭</li>
                <li>키 이름 입력 (예: "NVOIM Planner")</li>
                <li>생성된 키 복사 (sk-...로 시작하는 긴 문자열)</li>
                <li>⚠️ <strong>중요:</strong> 키는 한 번만 표시됩니다. 반드시 복사 후 안전하게 보관하세요!</li>
              </ol>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              💡 <strong>비용:</strong> 사용량에 따라 과금 (~$0.002/분석)
            </div>
          </div>
        </div>

        {/* Azure Speech */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">2. Azure Speech API 키 (필수)</h4>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">발급 절차:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li><a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Azure Portal</a>에 로그인 (무료 계정 생성 가능)</li>
                <li>상단 검색창에 "Speech Services" 검색</li>
                <li>"만들기" 또는 "Create" 클릭</li>
                <li>구독, 리소스 그룹 선택 (없으면 새로 생성)</li>
                <li>지역 선택: <strong>Korea Central</strong> 권장</li>
                <li>가격 책정 계층: <strong>Free F0</strong> (월 5시간 무료) 또는 Standard S0</li>
                <li>리소스 이름 입력 (예: "nvoim-speech")</li>
                <li>검토 및 만들기 → 배포 완료 대기</li>
                <li>생성된 리소스로 이동 → 왼쪽 메뉴에서 "키 및 엔드포인트" 클릭</li>
                <li>KEY 1 또는 KEY 2 복사</li>
              </ol>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              💡 <strong>비용:</strong> Free F0: 월 5시간 무료 / Standard S0: ~$1/시간
            </div>
          </div>
        </div>

        {/* 선택적 API */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-700 mb-2">선택 사항 (추후 확장용)</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Anthropic (Claude):</strong> <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.anthropic.com</a></p>
            <p>• <strong>Google AI:</strong> <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">makersuite.google.com/app/apikey</a></p>
          </div>
        </div>
      </div>

      {/* 보안 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">🔒 보안 및 주의사항</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• API 키는 암호화되어 안전하게 저장됩니다 (AES-256-GCM)</li>
          <li>• 절대 다른 사람과 공유하지 마세요</li>
          <li>• 키가 유출된 경우 즉시 해당 플랫폼에서 키를 삭제하고 새로 발급받으세요</li>
          <li>• 정기적으로 사용량을 확인하여 예상치 못한 과금을 방지하세요</li>
        </ul>
      </div>

      {/* 새 키 추가 모달 */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">새 API 키 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 제공자
                </label>
                <select
                  value={newKey.keyType}
                  onChange={(e) => setNewKey({ ...newKey, keyType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI (필수)</option>
                  <option value="azure">Azure Speech (필수)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google AI</option>
                  <option value="custom">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  키 이름
                </label>
                <input
                  type="text"
                  value={newKey.keyName}
                  onChange={(e) => setNewKey({ ...newKey, keyName: e.target.value })}
                  placeholder="예: 내 OpenAI 키"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 키
                </label>
                <input
                  type="password"
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowNewKeyModal(false);
                  setNewKey({ keyType: 'openai', keyName: '', apiKey: '' });
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                취소
              </button>
              <button
                onClick={addApiKey}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    추가 중...
                  </>
                ) : (
                  '추가'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
