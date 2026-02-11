# 🚀 앤보임 플래너 프로 - AI 추천 시스템 빠른 시작 가이드

## ⚡ 5분 만에 시작하기

### 1️⃣ 데이터베이스 마이그레이션 (1분)

```bash
cd /Users/twins/Downloads/nvoim-planer-pro

# Supabase 마이그레이션 실행
supabase db push
```

**또는** Supabase Dashboard에서:
1. SQL Editor 열기
2. `supabase/migrations/20260210_student_level_test_and_goals.sql` 실행
3. `supabase/migrations/20260210_create_level_test_bucket.sql` 실행

---

### 2️⃣ 패키지 설치 (30초)

```bash
cd apps/planner-web
npm install  # openai 패키지 포함
```

---

### 3️⃣ 개발 서버 시작 (30초)

```bash
npm run dev
```

서버가 시작되면: http://localhost:3000

---

### 4️⃣ OpenAI API 키 등록 (2분)

#### 4-1. OpenAI API 키 발급
1. https://platform.openai.com/api-keys 접속
2. "Create new secret key" 클릭
3. 생성된 키 복사 (⚠️ 한 번만 표시됨!)

#### 4-2. 플래너 프로에 등록
1. 사이드바 > **설정** > **API 키** 클릭
2. **"새 API 키 추가"** 버튼 클릭
3. 정보 입력:
   - API 제공자: **OpenAI**
   - 키 이름: 예) "내 OpenAI 키"
   - API 키: 발급받은 키 붙여넣기
4. **"저장"** 클릭

✅ API 키 등록 완료!

---

### 5️⃣ 첫 AI 추천 생성 (1분)

#### 5-1. 학생 선택
1. 사이드바 > **학생 관리** 클릭
2. 학생 1명 선택

#### 5-2. 레벨테스트 업로드
1. **"기본 정보"** 탭 클릭
2. 우측 상단 **"수정"** 버튼 클릭
3. **"레벨테스트 정보"** 섹션에서 이미지 업로드
4. 우측 상단 **"저장"** 클릭

#### 5-3. 학습 목표 입력 (선택사항)
1. **"학습 목표"** 섹션에서:
   - 목표 카테고리 선택 (예: 토익스피킹)
   - 목표 달성 희망 날짜 선택
   - 목표 설명 입력 (예: "6개월 후 토익스피킹 Level 6 달성")
2. **"저장"** 클릭

#### 5-4. AI 추천 생성
1. **"학습 기록"** 탭 클릭
2. 우측 상단 **"AI 추천 생성"** 버튼 클릭
3. ⏳ 10-30초 대기
4. ✅ 추천 결과 확인!

---

## 📋 체크리스트

배포 전 필수 확인사항:

- [ ] Supabase 마이그레이션 실행 완료
- [ ] `level-test-images` Storage 버킷 생성 확인
- [ ] `openai` 패키지 설치 확인
- [ ] OpenAI API 키 등록 완료
- [ ] 테스트 학생으로 AI 추천 생성 성공

---

## 🆘 문제 해결

### "API 키가 설정되지 않았습니다" 오류
→ 설정 > API 키에서 OpenAI 키 등록 확인

### "레벨테스트 결과표를 업로드해주세요" 경고
→ 기본 정보 탭에서 레벨테스트 이미지 업로드

### 이미지 업로드 실패
→ Supabase Storage 버킷 `level-test-images` 생성 확인

### AI 분석 오류
→ OpenAI API 키 유효성 및 사용량 확인

---

## 📚 상세 문서

- **사용자 가이드**: [docs/AI_RECOMMENDATIONS_GUIDE.md](docs/AI_RECOMMENDATIONS_GUIDE.md)
- **구현 상세**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **원래 계획**: 최초 계획 문서 참고

---

## 💡 팁

### 비용 절약
- 학생당 월 1회 추천 생성 권장
- 레벨테스트나 목표가 크게 바뀌지 않았다면 재생성 불필요

### 추천 품질 향상
- ✅ 선명한 레벨테스트 이미지 사용
- ✅ 구체적인 학습 목표 작성
- ✅ 과거 학습 이력 정확하게 기록

---

**최종 업데이트**: 2026년 2월 10일
