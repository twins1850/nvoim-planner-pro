'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { Smartphone, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface Device {
  fingerprint: string;
  registered_at: string;
  last_seen: string;
  user_agent: string;
  description: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [maxDevices, setMaxDevices] = useState(2);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDevices();
    getCurrentFingerprint();
  }, []);

  async function loadDevices() {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      const { data: license, error: licenseError } = await supabase
        .from('licenses')
        .select('device_tokens, max_devices')
        .eq('planner_id', user.id)
        .eq('status', 'active')
        .single();

      if (licenseError) {
        setError('라이선스 정보를 불러올 수 없습니다.');
        return;
      }

      if (license) {
        setDevices(license.device_tokens || []);
        setMaxDevices(license.max_devices || 2);
      }
    } catch (err: any) {
      setError('디바이스 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('Load devices error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function getCurrentFingerprint() {
    try {
      const fingerprint = await generateDeviceFingerprint();
      setCurrentFingerprint(fingerprint);
    } catch (err) {
      console.error('Fingerprint generation error:', err);
    }
  }

  async function removeDevice(fingerprint: string) {
    if (fingerprint === currentFingerprint) {
      setError('현재 사용 중인 디바이스는 제거할 수 없습니다.');
      return;
    }

    if (!confirm('이 디바이스를 제거하시겠습니까?')) {
      return;
    }

    setRemoving(fingerprint);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      // 현재 라이선스 정보 가져오기
      const { data: license } = await supabase
        .from('licenses')
        .select('device_tokens')
        .eq('planner_id', user.id)
        .eq('status', 'active')
        .single();

      if (!license) {
        setError('라이선스 정보를 찾을 수 없습니다.');
        return;
      }

      // 디바이스 제거
      const updatedDevices = (license.device_tokens || []).filter(
        (d: Device) => d.fingerprint !== fingerprint
      );

      const { error: updateError } = await supabase
        .from('licenses')
        .update({ device_tokens: updatedDevices })
        .eq('planner_id', user.id)
        .eq('status', 'active');

      if (updateError) {
        setError('디바이스 제거 중 오류가 발생했습니다.');
        console.error('Remove device error:', updateError);
        return;
      }

      setSuccess('디바이스가 성공적으로 제거되었습니다.');
      await loadDevices();
    } catch (err: any) {
      setError('디바이스 제거 중 오류가 발생했습니다.');
      console.error('Remove device error:', err);
    } finally {
      setRemoving(null);
    }
  }

  async function updateDeviceDescription(fingerprint: string, description: string) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: license } = await supabase
        .from('licenses')
        .select('device_tokens')
        .eq('planner_id', user.id)
        .eq('status', 'active')
        .single();

      if (!license) return;

      const updatedDevices = (license.device_tokens || []).map((d: Device) =>
        d.fingerprint === fingerprint ? { ...d, description } : d
      );

      await supabase
        .from('licenses')
        .update({ device_tokens: updatedDevices })
        .eq('planner_id', user.id)
        .eq('status', 'active');

      await loadDevices();
    } catch (err) {
      console.error('Update description error:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            등록된 디바이스 관리
          </h1>
          <p className="text-gray-600">
            최대 {maxDevices}개의 디바이스에서 라이선스를 사용할 수 있습니다.
            현재 {devices.length}개의 디바이스가 등록되어 있습니다.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {devices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              등록된 디바이스가 없습니다.
            </div>
          ) : (
            devices.map((device) => {
              const isCurrentDevice = device.fingerprint === currentFingerprint;

              return (
                <div
                  key={device.fingerprint}
                  className={`p-6 ${
                    isCurrentDevice
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Smartphone className={`w-6 h-6 mt-1 ${
                        isCurrentDevice ? 'text-blue-600' : 'text-gray-400'
                      }`} />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={device.description || ''}
                            onChange={(e) => updateDeviceDescription(device.fingerprint, e.target.value)}
                            placeholder="디바이스 이름 (예: 집 컴퓨터, 사무실 노트북)"
                            className="text-lg font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 -ml-1"
                          />
                          {isCurrentDevice && (
                            <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
                              현재 디바이스
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">등록일:</span>{' '}
                            {new Date(device.registered_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p>
                            <span className="font-medium">마지막 사용:</span>{' '}
                            {new Date(device.last_seen).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {device.user_agent}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!isCurrentDevice && (
                      <button
                        onClick={() => removeDevice(device.fingerprint)}
                        disabled={removing === device.fingerprint}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="디바이스 제거"
                      >
                        {removing === device.fingerprint ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">안내 사항</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>현재 사용 중인 디바이스는 제거할 수 없습니다.</li>
            <li>최대 {maxDevices}개의 디바이스에서 동시에 사용할 수 있습니다.</li>
            <li>디바이스를 제거하면 해당 디바이스에서 즉시 로그아웃됩니다.</li>
            <li>디바이스 이름을 클릭하여 구분하기 쉬운 이름으로 변경할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
