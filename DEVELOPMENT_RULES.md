# 🚀 NVOIM Planner Pro - 개발 규칙

## 📋 필수 개발 규칙

### 🌐 Rule #1: 모든 외부 설정은 Playwright로 직접 수행
**모든 설정 작업은 Playwright 브라우저 자동화를 통해 직접 접속해서 수행한다.**

#### 적용 대상:
- ✅ **Supabase 웹 콘솔 설정**
  - Storage 버킷 생성/설정
  - RLS (Row Level Security) 정책 설정
  - 데이터베이스 스키마 변경
  - API 키 설정

- ✅ **기타 외부 서비스 설정**
  - Vercel 배포 설정
  - 도메인 설정
  - 환경 변수 설정

#### 이유:
1. **재현 가능성**: 모든 설정 과정이 코드로 문서화되어 재현 가능
2. **자동화**: 수동 설정 실수 방지 및 자동화
3. **투명성**: 설정 과정을 단계별로 확인 가능
4. **일관성**: 모든 환경에서 동일한 설정 보장

#### 예시:
```typescript
// ❌ 잘못된 방법: 수동 설정 안내
"Supabase 웹 콘솔에서 수동으로 버킷을 생성하세요"

// ✅ 올바른 방법: Playwright 자동화
await page.goto('https://app.supabase.com/project/[project-id]/storage');
await page.click('[data-testid="create-bucket-button"]');
await page.fill('[name="bucket-name"]', 'homework-files');
```

---

## 🛠️ 추가 개발 규칙

### Rule #2: 에러 처리
- 모든 API 호출에 적절한 에러 처리 구현
- 사용자 친화적인 에러 메시지 표시
- 재시도 로직 구현 (네트워크 오류 등)

### Rule #3: 타입 안전성
- TypeScript 적극 활용
- any 타입 사용 최소화
- 인터페이스 및 타입 정의 우선

### Rule #4: 성능 최적화
- 파일 크기 제한 (20MB)
- 이미지 최적화
- 지연 로딩 적용

### Rule #5: 보안
- RLS 정책 필수 적용
- API 키 환경 변수 관리
- 입력 값 검증

### Rule #6: 사용자 경험
- 로딩 상태 표시
- 진행률 표시 (업로드 등)
- 적절한 피드백 제공

### Rule #7: 코드 품질
- ESLint 규칙 준수
- 일관된 코딩 스타일
- 의미있는 변수/함수명

---

## 📁 프로젝트 구조 규칙

### 파일 명명 규칙
```
컴포넌트: PascalCase (예: CreateHomeworkModal.tsx)
유틸리티: camelCase (예: storage.ts)
페이지: kebab-case (예: homework-list.tsx)
```

### 폴더 구조
```
src/
├── components/     # 재사용 가능한 컴포넌트
├── lib/           # 유틸리티 함수
├── app/           # Next.js 앱 라우터
├── types/         # TypeScript 타입 정의
└── styles/        # 스타일 파일
```

---

## 🧪 테스트 규칙

### Rule #8: 자동화된 테스트
- Playwright E2E 테스트 작성
- 주요 사용자 플로우 테스트 커버
- 에러 시나리오 테스트 포함

---

## 📝 문서화 규칙

### Rule #9: 코드 문서화
- JSDoc 주석 작성
- README.md 업데이트
- API 문서 작성

### Rule #10: 변경 이력
- 의미있는 커밋 메시지
- CHANGELOG.md 업데이트
- 마이그레이션 스크립트 문서화

### Rule #11: 한글 커뮤니케이션 (중요)
**모든 응답은 마지막에 반드시 한글 요약을 포함해야 한다.**

#### 적용 방법:
- 기술적인 내용을 영어로 작성한 후, 마지막에 "## 한글 요약" 섹션 추가
- 핵심 내용을 명확하고 간결한 한글로 설명
- 사용자가 빠르게 이해할 수 있도록 구조화

#### 예시:
```markdown
[영어 기술 문서...]

---

## 한글 요약

**Phase 8 배포 완료**
- ✅ 프론트엔드 3개 페이지 배포 완료
- ✅ 백엔드 인프라 (DB, Storage, Edge Function) 배포 완료
- ⏳ 수동 테스트 필요: API 키 등록 후 영상 업로드 테스트
```

---

## ⚠️ 주의사항

1. **절대 수동 설정하지 않기**: Playwright 자동화가 우선
2. **설정 변경 시 코드로 기록**: 모든 변경사항은 코드로 추적 가능해야 함
3. **환경별 분리**: 개발/스테이징/프로덕션 환경 명확히 분리
4. **백업 계획**: 중요한 설정 변경 전 백업 수행

---

**마지막 업데이트**: 2026년 1월 14일
**담당자**: Claude Code Assistant
**버전**: 1.1