import { SolapiMessageService } from 'solapi';
import crypto from 'crypto';

/**
 * SOLAPI HMAC-SHA256 서명 생성
 */
function generateSignature(
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  salt: string
): string {
  const message = timestamp + salt;
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(message);
  return hmac.digest('hex');
}

/**
 * SMS 발송 함수 (Solapi)
 */
export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 환경 변수 확인
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const fromNumber = process.env.SOLAPI_FROM_NUMBER;

    if (!apiKey || !apiSecret || !fromNumber) {
      console.error('[SMS] Missing Solapi credentials');
      return {
        success: false,
        error: 'Missing Solapi credentials',
      };
    }

    // Solapi 클라이언트 초기화
    const messageService = new SolapiMessageService(apiKey, apiSecret);

    // SMS 발송
    const result = await messageService.sendOne({
      to,
      from: fromNumber,
      text: message,
      // type: 'SMS', // SMS, LMS, MMS 중 선택 (기본값: SMS)
    });

    console.log('[SMS] Message sent successfully:', {
      to,
      messageId: result.messageId,
      statusCode: result.statusCode,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('[SMS] Failed to send message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * 카카오톡 알림톡 발송 함수 (Solapi REST API)
 *
 * 사전 준비 사항:
 * 1. SOLAPI 대시보드에서 카카오톡 Business Channel 연결
 * 2. PFID (Profile ID) 발급 받기
 * 3. 알림톡 템플릿 등록 및 승인 (1-3일 소요)
 * 4. 환경 변수에 KAKAO_PFID, KAKAO_TEMPLATE_ID 추가
 */
export async function sendKakaoAlimtalk({
  to,
  templateId,
  variables,
}: {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 환경 변수 확인
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const pfid = process.env.KAKAO_PFID;

    if (!apiKey || !apiSecret || !pfid) {
      console.error('[KAKAO] Missing Solapi or Kakao credentials');
      return {
        success: false,
        error: 'Missing credentials',
      };
    }

    // HMAC-SHA256 서명 생성
    const timestamp = Date.now().toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const signature = generateSignature(apiKey, apiSecret, timestamp, salt);

    // SOLAPI REST API 호출
    const response = await fetch(
      'https://api.solapi.com/messages/v4/send-many/detail',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
        },
        body: JSON.stringify({
          messages: [
            {
              to,
              from: pfid, // PFID (카카오톡 발신 프로필 ID)
              type: 'ATA', // ATA = 알림톡
              kakaoOptions: {
                pfId: pfid,
                templateId,
                variables,
                // disableSms: false, // 알림톡 실패 시 SMS 대체 발송 (선택)
              },
            },
          ],
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[KAKAO] API error:', result);
      return {
        success: false,
        error: result.errorMessage || 'Failed to send Kakao Alimtalk',
      };
    }

    console.log('[KAKAO] Alimtalk sent successfully:', {
      to,
      templateId,
      messageId: result.groupId,
    });

    return {
      success: true,
      messageId: result.groupId,
    };
  } catch (error: any) {
    console.error('[KAKAO] Failed to send Alimtalk:', error);
    return {
      success: false,
      error: error.message || 'Failed to send Kakao Alimtalk',
    };
  }
}

/**
 * SMS 템플릿 생성 함수
 */
export function getSMSTemplate(
  type: '7days' | '3days' | '1day' | 'expired',
  data: {
    userName: string;
    daysRemaining: number;
    expiresAt: string;
  }
): string {
  const { userName, daysRemaining } = data;

  const templates = {
    '7days': `[NVOIM Planner Pro]

${userName}님, 안녕하세요!

무료 체험 기간이 7일 남았습니다.

정식 라이선스 구매는
support@nplannerpro.com으로 문의해주세요.

감사합니다!`,

    '3days': `[NVOIM Planner Pro]

${userName}님, 체험 기간이 3일 남았습니다.

정식 라이선스 구매 문의:
support@nplannerpro.com

감사합니다!`,

    '1day': `[NVOIM Planner Pro]

⚠️ ${userName}님, 체험 만료 1일 전입니다!

정식 라이선스 구매는
support@nplannerpro.com

감사합니다!`,

    expired: `[NVOIM Planner Pro]

${userName}님, 체험 기간이 종료되었습니다.

정식 라이선스 구매 문의:
support@nplannerpro.com
010-XXXX-XXXX

감사합니다!`,
  };

  return templates[type];
}

/**
 * 카카오톡 알림톡 템플릿 변수 생성 함수
 *
 * 주의: 카카오톡 알림톡은 사전 승인된 템플릿만 사용 가능합니다.
 * SOLAPI 대시보드에서 아래 템플릿을 등록하고 승인받은 후
 * 발급받은 템플릿 ID를 환경 변수에 추가해야 합니다.
 *
 * 템플릿 예시 (승인 필요):
 * ---
 * [NVOIM Planner Pro]
 *
 * #{userName}님, 안녕하세요!
 *
 * 무료 체험 기간이 #{daysRemaining}일 남았습니다.
 * 만료일: #{expiresAt}
 *
 * 정식 라이선스 구매는
 * #{supportEmail}으로 문의해주세요.
 *
 * 감사합니다!
 * ---
 */
export function getKakaoAlimtalkVariables(
  type: '7days' | '3days' | '1day' | 'expired',
  data: {
    userName: string;
    daysRemaining: number;
    expiresAt: string;
  }
): Record<string, string> {
  const { userName, daysRemaining, expiresAt } = data;

  // 기본 템플릿 변수
  const baseVariables = {
    userName,
    daysRemaining: daysRemaining.toString(),
    expiresAt,
    supportEmail: 'support@nplannerpro.com',
    supportPhone: '010-XXXX-XXXX',
  };

  // 타입별 추가 변수 (필요시)
  const typeSpecificVariables: Record<string, Record<string, string>> = {
    '7days': {
      message: '무료 체험 기간이 7일 남았습니다.',
    },
    '3days': {
      message: '⚠️ 체험 기간이 3일 남았습니다.',
    },
    '1day': {
      message: '⚠️⚠️ 체험 만료 1일 전입니다!',
    },
    expired: {
      message: '체험 기간이 종료되었습니다.',
    },
  };

  return {
    ...baseVariables,
    ...typeSpecificVariables[type],
  };
}

/**
 * 카카오톡 알림톡 템플릿 ID 가져오기
 *
 * 환경 변수에서 템플릿 ID를 가져옵니다.
 * 각 타입별로 다른 템플릿을 사용하거나, 하나의 범용 템플릿을 사용할 수 있습니다.
 */
export function getKakaoTemplateId(
  type: '7days' | '3days' | '1day' | 'expired'
): string | null {
  // 타입별 개별 템플릿 (선택사항)
  const templateIds: Record<string, string | undefined> = {
    '7days': process.env.KAKAO_TEMPLATE_7DAYS,
    '3days': process.env.KAKAO_TEMPLATE_3DAYS,
    '1day': process.env.KAKAO_TEMPLATE_1DAY,
    expired: process.env.KAKAO_TEMPLATE_EXPIRED,
  };

  // 개별 템플릿이 있으면 사용, 없으면 범용 템플릿 사용
  return (
    templateIds[type] || process.env.KAKAO_TEMPLATE_TRIAL_REMINDER || null
  );
}
