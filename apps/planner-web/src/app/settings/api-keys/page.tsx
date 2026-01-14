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

      // 실제로는 서버 사이드에서 암호화해야 함
      // 여기서는 간단히 Base64로 인코딩 (보안상 좋지 않음 - 개선 필요)
      const { error: insertError } = await supabase
        .from('planner_api_keys')
        .insert({
          api_key_type: newKey.keyType,
          key_name: newKey.keyName,
          encrypted_api_key: newKey.apiKey, // TODO: 서버에서 암호화 처리 필요
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">API 키 발급 방법</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/api-keys</a></li>
          <li>• Anthropic (Claude): <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></li>
          <li>• Google AI: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">makersuite.google.com/app/apikey</a></li>
        </ul>
        <p className="text-sm text-blue-700 mt-3">
          ⚠️ 보안 주의: API 키는 안전하게 보관하고 절대 공유하지 마세요.
        </p>
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
                  <option value="openai">OpenAI</option>
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
