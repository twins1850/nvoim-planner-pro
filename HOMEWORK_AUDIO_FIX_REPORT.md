# 숙제 오디오 업로드/재생 문제 해결 보고서

**작성일**: 2026-02-12
**담당**: Claude Code (Sonnet 4.5)
**상태**: ✅ 해결 완료 (Web 환경)
**보류**: iOS/Android 모바일 환경 검증 필요

---

## 📋 목차

1. [문제 요약](#문제-요약)
2. [문제 발생 원인 분석](#문제-발생-원인-분석)
3. [해결 과정](#해결-과정)
4. [파일 변경 내역](#파일-변경-내역)
5. [테스트 결과](#테스트-결과)
6. [기술적 학습 포인트](#기술적-학습-포인트)
7. [향후 작업](#향후-작업)

---

## 문제 요약

### 증상
- 학생 앱에서 오디오 녹음 후 제출 시 파일이 정상적으로 업로드되지 않음
- 플래너 앱에서 제출된 오디오 재생 시 "Object not found" 에러 발생
- 다운로드 버튼 클릭 시 HTML 파일이 다운로드됨
- 오디오 플레이어의 재생 버튼이 비활성화 상태 (0:00 / 0:00)

### 영향 범위
- **학생 앱**: 오디오 제출 기능 완전 마비
- **플래너 앱**: 제출된 오디오 확인/재생 불가
- **비즈니스 임팩트**: 숙제 제출 워크플로우 중단

---

## 문제 발생 원인 분석

### 1️⃣ RLS 정책 테이블 참조 오류

**문제**:
```sql
-- ❌ 잘못된 RLS 정책
CREATE POLICY "Planners can read all submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  EXISTS (
    SELECT 1
    FROM public.profiles  -- ⚠️ 존재하지 않는 테이블!
    WHERE id = auth.uid()
  )
);
```

**원인**:
- 프로젝트에는 `profiles` 테이블이 없음
- 실제로는 `teacher_profiles`와 `student_profiles`로 분리되어 있음
- RLS 정책이 항상 false를 반환하여 접근 거부

**증상**:
```
Error: 파일 다운로드 URL 생성 실패: Object not found
POST /storage/v1/object/sign/homework-submissions/... 400 (Bad Request)
```

---

### 2️⃣ React Native fetch(localFileURI) 실패

**문제**:
```typescript
// ❌ React Native에서 실패하는 코드
const response = await fetch(audioUrl); // audioUrl은 file:/// 또는 blob:
const blob = await response.blob();
```

**원인**:
- React Native에서 `fetch()`는 로컬 파일 URI를 지원하지 않음
- `file:///` 프로토콜이나 `blob:` URL을 fetch하면 HTML 에러 페이지 반환
- Web 브라우저와 달리 React Native는 로컬 파일 시스템 접근 방식이 다름

**실제 업로드된 파일**:
```
파일명: audio_1770882898776.mp4
크기: 1.19 KB (실제 오디오는 50KB 이상이어야 함)
타입: text/html
내용: <!DOCTYPE html><html>...StudentApp...</html>
```

---

### 3️⃣ Blob URL 중복 fetch 문제

**문제**:
```typescript
// useAudioRecorder.ts - 첫 번째 fetch
const response = await fetch(state.audioUri);
const blob = await response.blob();
// size만 확인하고 blob은 버림

// HomeworkSubmissionScreen.tsx - 두 번째 fetch
const response = await fetch(audioUrl);
const blob = await response.blob();
// ❌ Blob URL이 이미 소비되어 HTML 에러 반환
```

**원인**:
- Web 환경에서 Blob URL은 한 번만 유효할 수 있음
- `prepareAudioForUpload`에서 이미 fetch했으나 blob을 반환하지 않음
- `handleAudioRecorded`에서 URI만 저장하고 재사용 시도
- 두 번째 fetch 시점에 Blob URL이 무효화되어 404 반환

---

### 4️⃣ Web vs Native 환경 차이 미처리

**문제**:
```typescript
// ❌ 모든 플랫폼에서 동일한 코드 사용 시도
const response = await fetch(audioUrl);
```

**차이점**:
| 플랫폼 | 오디오 형식 | 파일 접근 방법 | Blob URL 지원 |
|--------|------------|---------------|--------------|
| Web | audio/webm | fetch() | ✅ |
| iOS | audio/m4a | expo-file-system | ❌ |
| Android | audio/mp4 | expo-file-system | ❌ |

---

## 해결 과정

### 1단계: RLS 정책 수정

**파일**: `/supabase/migrations/026_fix_planner_storage_access.sql`

```sql
-- ✅ 올바른 RLS 정책
DROP POLICY IF EXISTS "Planners can read all submissions" ON storage.objects;

CREATE POLICY "Planners can read all submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  EXISTS (
    SELECT 1
    FROM public.teacher_profiles  -- ✅ 올바른 테이블 참조
    WHERE id = auth.uid()
  )
);
```

**실행**:
```bash
# Supabase Studio (https://supabase.com/dashboard)에서 실행
# Run 버튼 클릭 → Success 메시지 확인
```

**결과**: 플래너가 학생 제출 파일에 접근 가능해짐

---

### 2단계: Platform별 파일 처리 분리

**파일**: `/apps/student/src/screens/HomeworkSubmissionScreen.tsx`

**변경 1: 상태 관리 개선**
```typescript
// ❌ 이전: URI만 저장
const [audioUrl, setAudioUrl] = useState<string | null>(null);

// ✅ 수정: 전체 파일 객체 저장
const [audioFile, setAudioFile] = useState<any>(null);
```

**변경 2: 콜백 함수 수정**
```typescript
// ❌ 이전: URI만 받음
const handleAudioRecorded = (uri: string) => {
  setAudioUrl(uri);
  setSubmissionType('audio');
};

// ✅ 수정: 전체 객체 받음
const handleAudioRecorded = (audioFileData: any) => {
  setAudioFile(audioFileData);
  setSubmissionType('audio');
};
```

**변경 3: Platform별 업로드 로직**
```typescript
// ✅ Platform 감지 및 분기 처리
if (Platform.OS === 'web') {
  // Web: Blob URL fetch 사용
  const response = await fetch(audioFile.uri);
  blob = await response.blob();
  contentType = 'audio/webm';
  fileExtension = 'webm';

  console.log('🌐 Web 환경: Blob URL에서 파일 가져오기', {
    uri: audioFile.uri,
    blobSize: blob.size,
    blobType: blob.type
  });
} else {
  // Native: expo-file-system 사용
  const FileSystem = require('expo-file-system');

  const base64Audio = await FileSystem.readAsStringAsync(audioFile.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Base64 → Blob 변환
  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  contentType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';
  fileExtension = Platform.OS === 'ios' ? 'm4a' : 'mp4';
  blob = new Blob([byteArray], { type: contentType });

  console.log('📱 Native 환경: expo-file-system으로 파일 읽기');
}
```

---

### 3단계: 데이터베이스 리셋

**SQL 실행**:
```sql
-- 잘못된 제출 데이터 초기화
UPDATE homework_assignments
SET
  status = 'pending',
  submission_audio_url = NULL,
  submitted_at = NULL
WHERE
  student_id = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3'
  AND homework_id = 'f67cfe38-9270-44a8-8868-dbb8e0287dca';
```

**결과**: 학생이 재제출 가능한 상태로 복구

---

## 파일 변경 내역

### 1. 생성된 파일

| 파일 | 목적 | 라인 수 |
|------|------|--------|
| `/supabase/migrations/026_fix_planner_storage_access.sql` | RLS 정책 수정 | 29 |
| `/HOMEWORK_AUDIO_FIX_REPORT.md` | 본 문서 | - |

### 2. 수정된 파일

| 파일 | 변경 라인 | 주요 변경 |
|------|----------|----------|
| `/apps/student/src/screens/HomeworkSubmissionScreen.tsx` | 42, 70-73, 82-84, 96-167, 280-288 | Platform별 파일 처리 분리 |

**상세 변경 내역**:
```diff
# HomeworkSubmissionScreen.tsx

- const [audioUrl, setAudioUrl] = useState<string | null>(null);
+ const [audioFile, setAudioFile] = useState<any>(null);

- const handleAudioRecorded = (uri: string) => {
-   setAudioUrl(uri);
+ const handleAudioRecorded = (audioFileData: any) => {
+   setAudioFile(audioFileData);

- if (submissionType === 'audio' && !audioUrl) {
+ if (submissionType === 'audio' && !audioFile) {

+ // Platform별 분기 처리
+ if (Platform.OS === 'web') {
+   const response = await fetch(audioFile.uri);
+   blob = await response.blob();
+   contentType = 'audio/webm';
+ } else {
+   const FileSystem = require('expo-file-system');
+   const base64Audio = await FileSystem.readAsStringAsync(audioFile.uri, {
+     encoding: FileSystem.EncodingType.Base64,
+   });
+   // Base64 → Blob 변환
+ }
```

---

## 테스트 결과

### Web 환경 (✅ 성공)

**학생 앱 제출**:
```
🌐 Web 환경: Blob URL에서 파일 가져오기
  uri: blob:http://localhost:8081/a8812a0e-3cf5-4a14-8abf-54ef58b23ad4
  blobSize: 175142 bytes (175 KB)
  blobType: audio/webm

📤 음성 파일 업로드 중...
  platform: web
  filePath: ea03a8c4-1390-47df-83e2-79ac1712c6a3/f67cfe38-9270-44a8-8868-dbb8e0287dca/audio_1770889797455.webm
  blobSize: 175142
  blobType: audio/webm

✅ 음성 파일 업로드 완료: audio_1770889797455.webm
✅ 제출 완료
```

**플래너 앱 재생**:
- ✅ 오디오 플레이어 표시
- ✅ 재생 버튼 활성화 (초록색)
- ✅ 재생 시간 표시 (예: 0:05 / 0:10)
- ✅ 재생 버튼 클릭 → 음성 정상 재생
- ✅ 재생 속도 조절 기능 정상 작동
- ✅ 다운로드 버튼 → `.webm` 파일 다운로드 성공

**Supabase Storage 확인**:
```
버킷: homework-submissions
경로: ea03a8c4-1390-47df-83e2-79ac1712c6a3/f67cfe38-9270-44a8-8868-dbb8e0287dca/
파일: audio_1770889797455.webm
크기: 175,142 bytes (171 KB)
타입: audio/webm
```

---

### 이전 vs 이후 비교

| 항목 | 이전 (❌) | 이후 (✅) |
|------|----------|----------|
| 파일 크기 | 1,261 bytes | 175,142 bytes |
| 파일 타입 | text/html | audio/webm |
| 업로드 상태 | HTML 에러 페이지 | 실제 오디오 파일 |
| 플래너 재생 | "Object not found" | 정상 재생 |
| 다운로드 | HTML 파일 | .webm 오디오 파일 |
| 재생 버튼 | 비활성화 (회색) | 활성화 (초록) |
| 재생 시간 | 0:00 / 0:00 | 0:05 / 0:10 |

---

## 기술적 학습 포인트

### 1. React Native의 파일 시스템 제약

**교훈**: React Native는 Web API와 다른 파일 접근 방식을 사용함

```typescript
// ❌ Web에서는 작동, React Native에서는 실패
const response = await fetch('file:///path/to/audio.mp4');

// ✅ React Native에서 올바른 방법
import * as FileSystem from 'expo-file-system';
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64
});
```

---

### 2. Platform별 조건부 처리의 중요성

**교훈**: 크로스 플랫폼 개발 시 Platform.OS 확인 필수

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web 전용 로직
} else if (Platform.OS === 'ios') {
  // iOS 전용 로직
} else if (Platform.OS === 'android') {
  // Android 전용 로직
}
```

---

### 3. Supabase RLS 정책의 중요성

**교훈**: RLS 정책 오류는 디버깅이 어려움 → 테이블 참조 정확성 필수

```sql
-- ❌ 잘못된 테이블 참조는 항상 접근 거부
EXISTS (SELECT 1 FROM non_existent_table WHERE id = auth.uid())

-- ✅ 올바른 테이블 참조
EXISTS (SELECT 1 FROM teacher_profiles WHERE id = auth.uid())
```

**디버깅 팁**:
```sql
-- RLS 정책 테스트
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid"}';
SELECT * FROM storage.objects WHERE bucket_id = 'homework-submissions';
```

---

### 4. Blob URL의 생명주기

**교훈**: Blob URL은 재사용이 제한적 → 필요 시 Blob 객체 자체를 전달

```typescript
// ❌ URI만 전달 → 나중에 재fetch 시도 → 실패
const uri = URL.createObjectURL(blob);
callback(uri);

// ✅ Blob 객체 자체를 전달
callback({ uri, blob, metadata });
```

---

### 5. Base64 인코딩/디코딩

**교훈**: React Native에서 파일을 Base64로 변환 후 Blob으로 재구성

```typescript
// Base64 → Blob 변환 과정
const base64Audio = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64
});

const byteCharacters = atob(base64Audio);
const byteNumbers = new Array(byteCharacters.length);
for (let i = 0; i < byteCharacters.length; i++) {
  byteNumbers[i] = byteCharacters.charCodeAt(i);
}
const byteArray = new Uint8Array(byteNumbers);
const blob = new Blob([byteArray], { type: 'audio/mp4' });
```

---

## 향후 작업

### 1. iOS/Android 모바일 환경 검증 (🔴 필수)

**iOS 테스트**:
- [ ] Expo Go 앱 또는 iOS 시뮬레이터 실행
- [ ] 오디오 녹음 권한 확인
- [ ] expo-file-system 정상 작동 확인
- [ ] audio/m4a 형식 업로드 테스트
- [ ] 플래너 앱에서 m4a 재생 확인

**Android 테스트**:
- [ ] Android 에뮬레이터 또는 실기기 실행
- [ ] 오디오 녹음 권한 확인
- [ ] expo-file-system 정상 작동 확인
- [ ] audio/mp4 형식 업로드 테스트
- [ ] 플래너 앱에서 mp4 재생 확인

---

### 2. 플래너 앱 오디오 형식 지원 확장

**현재 상태**:
- ✅ audio/webm (Web)
- ⚠️ audio/m4a (iOS) - 미검증
- ⚠️ audio/mp4 (Android) - 미검증

**필요한 작업**:
```typescript
// SubmissionViewer.tsx
const audioElement = document.createElement('audio');
audioElement.src = signedUrl;

// 브라우저 호환성 확인
if (!audioElement.canPlayType('audio/m4a')) {
  // 서버에서 변환 또는 대체 플레이어 사용
}
```

---

### 3. 에러 처리 개선

**현재 문제**:
- 업로드 실패 시 사용자 친화적 메시지 부족
- 네트워크 오류와 파일 시스템 오류 구분 필요

**개선 방안**:
```typescript
try {
  await uploadAudio();
} catch (error) {
  if (error.message.includes('Object not found')) {
    Alert.alert('권한 오류', 'Storage 접근 권한을 확인해주세요.');
  } else if (error.message.includes('Network')) {
    Alert.alert('네트워크 오류', '인터넷 연결을 확인해주세요.');
  } else {
    Alert.alert('업로드 실패', `오류: ${error.message}`);
  }
}
```

---

### 4. 성능 최적화

**개선 포인트**:
- [ ] 대용량 오디오 파일 압축 (ffmpeg.wasm)
- [ ] 청크 업로드 구현 (>10MB)
- [ ] 업로드 진행률 표시
- [ ] 재시도 메커니즘 추가

---

### 5. 메시지 폴링 최적화

**현재 문제**:
```
📬 fetchUnreadCount 시작 (매 초마다 반복)
```

**해결 방법**:
```typescript
// MainTabNavigator.tsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchUnreadCount();
  }, 30000); // 30초마다로 변경

  return () => clearInterval(interval);
}, []);

// 또는 Supabase Realtime 구독 사용
supabase
  .channel('messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
    fetchUnreadCount();
  })
  .subscribe();
```

---

## 결론

### 성과
✅ Web 환경에서 오디오 업로드/재생 완전 정상화
✅ RLS 정책 수정으로 권한 문제 해결
✅ Platform별 파일 처리 로직 분리
✅ 175KB 실제 오디오 파일 업로드 성공
✅ 플래너 앱에서 재생, 다운로드, 속도 조절 모두 정상 작동

### 보류 사항
⚠️ iOS/Android 모바일 환경 테스트 미완료
⚠️ audio/m4a, audio/mp4 형식 검증 필요
⚠️ 메시지 폴링 최적화 필요

### 소요 시간
- 문제 분석: 1시간
- 코드 수정: 30분
- 테스트 및 검증: 30분
- **총 소요 시간**: 약 2시간

---

## 참고 자료

- [Expo FileSystem Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [React Native Platform Specific Code](https://reactnative.dev/docs/platform-specific-code)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

**작성자**: Claude Code (Sonnet 4.5)
**최종 업데이트**: 2026-02-12 18:50:00 KST
