import dotenv from 'dotenv';

dotenv.config();

// OpenAI API 설정
export const OPENAI_CONFIG = {
  API_KEY: process.env.OPENAI_API_KEY || '',
  MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  ENDPOINTS: {
    CHAT: 'https://api.openai.com/v1/chat/completions',
    EMBEDDINGS: 'https://api.openai.com/v1/embeddings'
  },
  // 재시도 설정
  RETRY: {
    MAX_RETRIES: 3,
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000
  },
  // 서비스 제한
  LIMITS: {
    MAX_TOKENS: 4096,
    MAX_PROMPT_TOKENS: 16000,
    TEMPERATURE: 0.7
  }
};

// 설정 유효성 검사
export function validateOpenAIConfig(): boolean {
  if (!OPENAI_CONFIG.API_KEY) {
    console.error('❌ OpenAI API 키가 설정되지 않았습니다.');
    return false;
  }
  
  console.log(`✅ OpenAI API 설정 완료 (모델: ${OPENAI_CONFIG.MODEL})`);
  return true;
}

// 서비스 상태 확인
export async function checkOpenAIServiceStatus(): Promise<boolean> {
  try {
    // 간단한 API 호출로 서비스 상태 확인
    const response = await fetch(OPENAI_CONFIG.ENDPOINTS.CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.MODEL,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      })
    });
    
    if (response.ok) {
      console.log('✅ OpenAI API 연결 확인 완료');
      return true;
    } else {
      console.error(`❌ OpenAI API 연결 실패: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ OpenAI API 연결 확인 중 오류 발생:', error);
    return false;
  }
}