import dotenv from 'dotenv';

dotenv.config();

// Azure Speech Service 설정
export const AZURE_SPEECH_CONFIG = {
  SUBSCRIPTION_KEY: process.env.AZURE_SPEECH_KEY || '',
  REGION: process.env.AZURE_SPEECH_REGION || 'koreacentral',
  LANGUAGE: 'en-US',
  ENDPOINTS: {
    STT: `https://${process.env.AZURE_SPEECH_REGION || 'koreacentral'}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
    PRONUNCIATION: `https://${process.env.AZURE_SPEECH_REGION || 'koreacentral'}.pronunciation.speech.microsoft.com/api/v1.0/evaluations`,
    SPEAKER_RECOGNITION: `https://${process.env.AZURE_SPEECH_REGION || 'koreacentral'}.api.cognitive.microsoft.com/speaker/identification/v2.0`
  },
  // 재시도 설정
  RETRY: {
    MAX_RETRIES: 3,
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000
  },
  // 서비스 제한
  LIMITS: {
    MAX_AUDIO_DURATION_SECONDS: 600, // 10분
    MAX_AUDIO_SIZE_BYTES: 15 * 1024 * 1024 // 15MB
  }
};

// 설정 유효성 검사
export function validateAzureConfig(): boolean {
  if (!AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY) {
    console.error('❌ Azure Speech Service 구독 키가 설정되지 않았습니다.');
    return false;
  }
  
  if (!AZURE_SPEECH_CONFIG.REGION) {
    console.error('❌ Azure Speech Service 리전이 설정되지 않았습니다.');
    return false;
  }
  
  console.log(`✅ Azure Speech Service 설정 완료 (리전: ${AZURE_SPEECH_CONFIG.REGION})`);
  return true;
}

// 서비스 상태 확인
export async function checkAzureServiceStatus(): Promise<boolean> {
  try {
    // 간단한 API 호출로 서비스 상태 확인
    const response = await fetch(
      `https://${AZURE_SPEECH_CONFIG.REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY
        }
      }
    );
    
    if (response.ok) {
      console.log('✅ Azure Speech Service 연결 확인 완료');
      return true;
    } else {
      console.error(`❌ Azure Speech Service 연결 실패: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Azure Speech Service 연결 확인 중 오류 발생:', error);
    return false;
  }
}