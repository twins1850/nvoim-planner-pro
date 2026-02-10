# 카카오톡 알림톡 설정 가이드

이 문서는 SOLAPI를 통한 카카오톡 알림톡 설정 방법을 안내합니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [카카오톡 Business Channel 생성](#카카오톡-business-channel-생성)
3. [SOLAPI 계정 설정](#solapi-계정-설정)
4. [채널 연결 및 PFID 받기](#채널-연결-및-pfid-받기)
5. [알림톡 템플릿 등록](#알림톡-템플릿-등록)
6. [환경 변수 설정](#환경-변수-설정)
7. [테스트](#테스트)

---

## 사전 준비

### 필요한 것들

- ✅ SOLAPI 계정 (이미 생성됨)
  - API KEY: `NCS2UTDEMCDAPIDY`
  - API SECRET: `VKIPUKUNXWU5AEFEQ4RIGVISQJ0AZZNG`
- ✅ 사업자등록증 (카카오톡 Business Channel 인증용)
- ✅ 대표 전화번호

### 비용

- **카카오톡 알림톡**: 13원/건 (대량 발송 시 6.5-10원까지 할인)
- **SMS 대체 발송**: 알림톡 실패 시 자동으로 SMS 발송 (선택 가능)

---

## 카카오톡 Business Channel 생성

### 1. 카카오톡 채널 관리자 센터 접속

1. https://center-pf.kakao.com/ 접속
2. 카카오 계정으로 로그인
3. "채널 만들기" 클릭

### 2. 채널 정보 입력

- **채널명**: 엔보임 플래너 프로
- **검색용 아이디**: @nvoim_planner (또는 원하는 ID)
- **카테고리**: 교육 > 학원/교습소
- **프로필 이미지**: 로고 업로드
- **소개글**: 엔보임 플래너 프로 - AI 기반 학원 관리 시스템

### 3. 사업자 인증

1. 채널 관리 → 설정 → 비즈니스 인증
2. 사업자등록증 업로드
3. 승인 대기 (1-2 영업일)

---

## SOLAPI 계정 설정

### 1. SOLAPI 대시보드 접속

1. https://solapi.com 접속
2. 로그인 (기존 계정 사용)

### 2. API 인증 정보 확인

- **API KEY**: `NCS2UTDEMCDAPIDY`
- **API SECRET**: `VKIPUKUNXWU5AEFEQ4RIGVISQJ0AZZNG`
- **발신번호**: `01012345678` (또는 실제 등록된 번호)

---

## 채널 연결 및 PFID 받기

### 1. SOLAPI에서 카카오톡 채널 연결

1. SOLAPI 대시보드 → 카카오톡 → 카카오톡 채널
2. "카카오톡 채널 연결하기" 클릭
3. 카카오 계정 로그인 (채널 생성 시 사용한 계정)
4. 채널 선택: @nvoim_planner
5. 연동 승인

### 2. PFID (Profile ID) 확인

연동 완료 후 SOLAPI 대시보드에서 PFID 확인:
- 카카오톡 → 카카오톡 채널 → 내 채널 목록
- **PFID**: `KA01PF...` 형식의 ID 복사

**중요**: 이 PFID를 환경 변수에 추가해야 합니다.

---

## 알림톡 템플릿 등록

### 1. SOLAPI 템플릿 등록

1. SOLAPI 대시보드 → 카카오톡 → 템플릿 관리
2. "새 템플릿 추가" 클릭

### 2. 템플릿 내용 (체험 만료 알림)

```
[NVOIM Planner Pro]

#{userName}님, 안녕하세요!

무료 체험 기간이 #{daysRemaining}일 남았습니다.
만료일: #{expiresAt}

정식 라이선스 구매는
#{supportEmail}으로 문의해주세요.

감사합니다!
```

**변수**:
- `userName`: 사용자 이름
- `daysRemaining`: 남은 일수
- `expiresAt`: 만료일
- `supportEmail`: 고객 지원 이메일

### 3. 템플릿 정보 입력

- **템플릿명**: trial_expiry_reminder
- **카테고리**: 회원 관리 > 가입/탈퇴 안내
- **강조 유형**: 일반 (일반형)
- **템플릿 메시지 유형**: 기본형
- **버튼**: 없음 (또는 "업그레이드하기" 링크 버튼 추가 가능)

### 4. 템플릿 검수 신청

- "검수 요청" 클릭
- 승인 대기 (1-3 영업일)

### 5. 템플릿 ID 확인

승인 완료 후 템플릿 목록에서 **템플릿 코드** 확인:
- 예: `TS_1234567890` 형식

### 6. 등록된 템플릿 (2026-01-30)

**✅ 템플릿 1: 체험 만료 알림**
- **템플릿 코드**: `8EjJhZnqew`
- **상태**: 검수진행중
- **등록일**: 2026-01-30

**✅ 템플릿 2: 회원가입 환영**
- **템플릿 코드**: `NuoWkuzvbB`
- **상태**: 검수진행중
- **등록일**: 2026-01-30

**✅ 템플릿 3: 정식 라이선스 만료 알림**
- **템플릿 코드**: `Oz2FAcEfT`
- **상태**: 검수진행중
- **등록일**: 2026-01-30

---

## 환경 변수 설정

### 1. Vercel 환경 변수 추가

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables

#### 이미 설정된 변수

```env
SOLAPI_API_KEY=NCS2UTDEMCDAPIDY
SOLAPI_API_SECRET=VKIPUKUNXWU5AEFEQ4RIGVISQJ0AZZNG
SOLAPI_FROM_NUMBER=01012345678
```

#### 추가 필요한 변수 (템플릿 승인 후)

```env
# 카카오톡 PFID (필수 - 채널 연결 시 확인)
KAKAO_PFID=KA01PF...

# 카카오톡 템플릿 ID (필수 - 템플릿 승인 후 추가)
KAKAO_TEMPLATE_TRIAL_EXPIRY=8EjJhZnqew
KAKAO_TEMPLATE_SIGNUP_WELCOME=NuoWkuzvbB
KAKAO_TEMPLATE_PAID_EXPIRY=Oz2FAcEfT
```

### 2. .env.local 예시 (로컬 개발)

```env
# SOLAPI
SOLAPI_API_KEY=NCS2UTDEMCDAPIDY
SOLAPI_API_SECRET=VKIPUKUNXWU5AEFEQ4RIGVISQJ0AZZNG
SOLAPI_FROM_NUMBER=01012345678

# KakaoTalk
KAKAO_PFID=KA01PF...
KAKAO_TEMPLATE_TRIAL_REMINDER=TS_1234567890
```

---

## 테스트

### 1. 로컬 테스트

```bash
# 테스트 API 호출 (로컬 개발 서버 실행 중)
curl -X POST http://localhost:3000/api/trial/expiry-reminder \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

### 2. 테스트 라이선스 생성

Supabase 대시보드 또는 SQL Editor에서:

```sql
-- 테스트용 체험 라이선스 생성 (만료 2일 전)
UPDATE licenses
SET
  trial_expires_at = NOW() + INTERVAL '2 days',
  trial_notification_sent = FALSE
WHERE id = 'your-license-id';
```

### 3. 발송 로그 확인

```sql
-- 알림 발송 로그 확인
SELECT
  notification_type,
  email_sent,
  sms_sent,
  kakao_sent,
  sent_at,
  error_message,
  kakao_error_message
FROM trial_notifications
ORDER BY sent_at DESC
LIMIT 10;
```

### 4. 성공 확인

- ✅ 이메일 수신
- ✅ 카카오톡 알림톡 수신 (또는 SMS 수신)
- ✅ `trial_notifications` 테이블에 로그 저장

---

## 💡 주요 사항

### 카카오톡 알림톡 vs SMS

- **카카오톡 알림톡** (우선 순위 높음)
  - 비용: 13원/건 (대량 발송 시 6.5-10원)
  - 도달률: ~98%
  - 이미지/버튼 지원
  - 템플릿 사전 승인 필요

- **SMS** (대체 발송)
  - 비용: 15-20원/건
  - 도달률: ~95%
  - 긴 메시지는 LMS (45원/건)
  - 템플릿 승인 불필요

### 알림톡 발송 실패 시

코드에서 자동으로 SMS로 대체 발송됩니다:

```typescript
// 카카오톡 발송 시도 → 실패 시 SMS 자동 발송
const kakaoResult = await sendKakaoAlimtalk(...);
if (!kakaoResult.success) {
  const smsResult = await sendSMS(...);
}
```

### 비용 절감 팁

1. **알림톡 우선 사용**: SMS보다 50% 저렴
2. **대량 발송 할인**: 월 10,000건 이상 시 할인 협상 가능
3. **충전 금액**: 10만원 이상 충전 시 추가 적립금

---

## 🔧 문제 해결

### PFID를 찾을 수 없음

- SOLAPI 대시보드 → 카카오톡 → 카카오톡 채널에서 재확인
- 채널이 연동되어 있지 않으면 다시 연동

### 템플릿 ID를 찾을 수 없음

- SOLAPI 대시보드 → 카카오톡 → 템플릿 관리에서 확인
- 승인된 템플릿만 사용 가능

### 알림톡 발송 실패

1. 환경 변수 확인: `KAKAO_PFID`, `KAKAO_TEMPLATE_TRIAL_REMINDER`
2. 템플릿 변수 매칭 확인: 템플릿에 정의된 변수와 코드에서 전달하는 변수가 일치하는지 확인
3. SOLAPI 잔액 확인: 대시보드에서 잔액 확인

### 로그 확인

```bash
# Vercel 로그 확인
vercel logs --follow

# 특정 함수 로그
vercel logs /api/trial/expiry-reminder
```

---

## 📞 지원

- **SOLAPI 고객 지원**: support@solapi.com
- **카카오톡 채널 문의**: https://cs.kakao.com/helps?service=8
- **개발 문의**: support@nplannerpro.com

---

**마지막 업데이트**: 2026-01-30
**작성자**: Claude Code Assistant

---

## 📝 완료 현황 (2026-01-30)

### ✅ 완료된 작업
1. SOLAPI 계정 생성 및 API 키 발급
2. 카카오톡 Business Channel 생성 및 연결
3. 알림톡 템플릿 3개 등록 (검수 대기 중)
4. 코드 구현 완료 (`/lib/send-sms.ts`, `/api/trial/expiry-reminder/route.ts`)
5. 데이터베이스 마이그레이션 작성 완료

### ⏳ 대기 중
1. 카카오톡 템플릿 승인 (1-3 영업일)
2. 승인 후 Vercel 환경 변수 추가
3. 승인 후 Supabase 마이그레이션 적용
4. 승인 후 실제 발송 테스트
