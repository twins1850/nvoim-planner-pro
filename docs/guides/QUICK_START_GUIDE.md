# 🚀 앤보임 플래너 프로 - AI 기능 빠른 시작 가이드

## 📋 체크리스트

- [ ] 1. 데이터베이스 마이그레이션 실행
- [ ] 2. Storage 버킷 생성 확인
- [ ] 3. OpenAI API 키 발급
- [ ] 4. API 키 등록
- [ ] 5. 기능 테스트

---

## Step 1: 데이터베이스 마이그레이션 실행

### 방법 A: Supabase Dashboard (권장)

1. **Supabase 프로젝트 대시보드 접속**
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭

3. **마이그레이션 1 실행** - student_profiles 테이블 업데이트
   ```sql
   -- 파일: supabase/migrations/20260210_student_level_test_and_goals.sql
   -- 내용을 복사하여 붙여넣고 "Run" 클릭

   ALTER TABLE public.student_profiles
   ADD COLUMN IF NOT EXISTS level_test_image_url TEXT,
   ADD COLUMN IF NOT EXISTS level_test_date DATE,
   ADD COLUMN IF NOT EXISTS goal_description TEXT,
   ADD COLUMN IF NOT EXISTS goal_target_date DATE,
   ADD COLUMN IF NOT EXISTS goal_category TEXT;

   COMMENT ON COLUMN public.student_profiles.level_test_image_url IS '앤보임 레벨테스트 결과표 이미지 URL (Supabase Storage)';
   COMMENT ON COLUMN public.student_profiles.level_test_date IS '레벨테스트 실시 날짜';
   COMMENT ON COLUMN public.student_profiles.goal_description IS '학생이 이루고자 하는 목표 상세 설명';
   COMMENT ON COLUMN public.student_profiles.goal_target_date IS '목표 달성 희망 날짜';
   COMMENT ON COLUMN public.student_profiles.goal_category IS '목표 카테고리 (토익스피킹, 해외여행, 일상영어, 워킹홀리데이, 비즈니스영어, 유학준비, 기타)';

   CREATE INDEX IF NOT EXISTS idx_student_profiles_level_test
   ON public.student_profiles(level_test_date)
   WHERE level_test_image_url IS NOT NULL;

   CREATE INDEX IF NOT EXISTS idx_student_profiles_goal_category
   ON public.student_profiles(goal_category)
   WHERE goal_category IS NOT NULL;
   ```

4. **마이그레이션 2 실행** - Storage 버킷 생성
   ```sql
   -- 파일: supabase/migrations/20260210_create_level_test_bucket.sql
   -- 내용을 복사하여 붙여넣고 "Run" 클릭

   INSERT INTO storage.buckets (id, name, public)
   VALUES ('level-test-images', 'level-test-images', true)
   ON CONFLICT (id) DO NOTHING;

   CREATE POLICY "Planners can upload level test images"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'level-test-images'
     AND auth.uid() IS NOT NULL
   );

   CREATE POLICY "Planners can view level test images"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'level-test-images');

   CREATE POLICY "Planners can update their level test images"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'level-test-images'
     AND auth.uid()::text = (storage.foldername(name))[1]
   );

   CREATE POLICY "Planners can delete their level test images"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'level-test-images'
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

### 방법 B: Supabase CLI (선택)

```bash
cd /Users/twins/Downloads/nvoim-planer-pro

# Supabase 프로젝트에 연결
supabase link --project-ref YOUR_PROJECT_REF

# 마이그레이션 실행
supabase db push
```

---

## Step 2: Storage 버킷 확인

1. **Supabase Dashboard → Storage 메뉴**
2. **"level-test-images" 버킷 확인**
   - 없으면 Step 1의 마이그레이션 2 다시 실행
3. **Public 설정 확인** (체크되어 있어야 함)

---

## Step 3: OpenAI API 키 발급

### 3-1. OpenAI 계정 생성/로그인
- https://platform.openai.com/signup

### 3-2. API 키 발급
1. https://platform.openai.com/api-keys 접속
2. "Create new secret key" 버튼 클릭
3. 키 이름 입력: `NVOIM Planner` (또는 원하는 이름)
4. 생성된 키 복사 (sk-...로 시작하는 긴 문자열)

   ⚠️ **중요**: 키는 한 번만 표시됩니다. 반드시 복사 후 안전하게 보관하세요!

### 3-3. 결제 방법 등록 (필수)
1. https://platform.openai.com/settings/organization/billing/overview
2. "Add payment method" 클릭
3. 카드 정보 입력
4. 사용량 제한 설정 (권장: $10/월)

---

## Step 4: 앤보임 플래너에 API 키 등록

### 4-1. 플래너 웹앱 로그인
- https://your-planner-app.vercel.app (또는 로컬: http://localhost:3000)

### 4-2. API 키 설정 페이지 이동
1. 왼쪽 사이드바에서 "설정" 클릭
2. "API 키" 메뉴 클릭

### 4-3. OpenAI API 키 추가
1. "새 키 추가" 버튼 클릭
2. **API 제공자**: "OpenAI (필수)" 선택
3. **키 이름**: "내 OpenAI 키" (또는 원하는 이름)
4. **API 키**: Step 3에서 복사한 키 붙여넣기 (sk-...)
5. "추가" 버튼 클릭
6. ✅ 목록에 키가 표시되고 "활성" 상태인지 확인

---

## Step 5: 기능 테스트

### 5-1. 학생 선택
1. "학생 관리" 메뉴 클릭
2. 테스트할 학생 선택 (또는 새 학생 추가)

### 5-2. 레벨테스트 업로드
1. **기본 정보** 탭에서 "수정" 버튼 클릭
2. 아래로 스크롤하여 "레벨테스트 정보" 섹션 찾기
3. "레벨테스트 결과표 이미지" 파일 선택
   - 샘플 이미지: 앤보임 레벨테스트 결과표 (JPG, PNG)
4. 이미지 업로드 확인 (미리보기 표시됨)
5. **저장** 버튼 클릭

### 5-3. 학습 목표 입력
1. 같은 페이지에서 "학습 목표" 섹션 찾기
2. **목표 카테고리**: "토익스피킹" 선택 (예시)
3. **목표 달성 희망 날짜**: 6개월 후 날짜 선택
4. **목표 상세 설명**:
   ```
   6개월 후 토익스피킹 Level 6 달성
   해외 비즈니스 미팅 대응 능력 향상
   ```
5. **저장** 버튼 클릭

### 5-4. AI 추천 생성
1. **학습 기록** 탭으로 이동
2. "AI 추천 과정" 섹션 찾기
3. **"AI 추천 생성"** 버튼 클릭
4. 분석 진행 대기 (약 5-10초)
   - "분석 중..." 로딩 표시 확인
5. ✅ 결과 확인:
   - **3개 추천 카드** 표시
   - 각 카드에 우선순위, 매칭률, 과정명, 추천 이유 표시
   - **AI 분석 인사이트** 표시 (강점, 개선 영역, 학습 방향)

### 5-5. 수강 과정 이력 확인
1. 같은 **학습 기록** 탭에서 위로 스크롤
2. **"수강 과정 이력"** 섹션 확인
3. 현재 수강 중인 과정 표시 확인 (초록색 테두리)
4. 과거 이력 타임라인 확인 (완료/전환/중단 상태별 색상)

---

## ✅ 테스트 성공 기준

- [ ] 레벨테스트 이미지가 업로드되고 미리보기로 표시됨
- [ ] 학습 목표가 저장되고 표시됨
- [ ] AI 추천이 생성되어 3개 카드가 표시됨
- [ ] 각 추천 카드에 매칭률, 과정명, 추천 이유가 표시됨
- [ ] AI 인사이트가 강점/개선영역/학습방향으로 나뉘어 표시됨
- [ ] 수강 과정 이력이 타임라인으로 표시됨

---

## 🐛 문제 해결

### 문제 1: "API 키가 설정되지 않았습니다" 오류
**해결 방법**:
1. 설정 > API 키 페이지로 이동
2. OpenAI 키가 **"활성"** 상태인지 확인
3. 없으면 Step 4 다시 실행

### 문제 2: 이미지 업로드 실패
**해결 방법**:
1. Supabase Dashboard → Storage → "level-test-images" 버킷 확인
2. 없으면 Step 1의 마이그레이션 2 다시 실행
3. 이미지 크기 확인 (20MB 이하)

### 문제 3: AI 추천 생성 실패
**가능한 원인**:
- OpenAI API 키가 유효하지 않음
- API 사용량 초과
- 네트워크 오류

**해결 방법**:
1. OpenAI 플랫폼에서 API 키 상태 확인
2. 사용량 및 결제 방법 확인
3. 브라우저 콘솔(F12) 에러 메시지 확인

### 문제 4: 레벨테스트 필드가 보이지 않음
**해결 방법**:
1. Step 1의 마이그레이션 1이 실행되었는지 확인
2. Supabase Dashboard → Table Editor → student_profiles 테이블 확인
3. `level_test_image_url`, `level_test_date`, `goal_description` 등 필드 존재 확인

---

## 💰 예상 비용

### OpenAI API 사용 비용
- **Vision API**: 이미지 분석 1회당 약 $0.02-0.03
- **GPT-4o**: 추천 생성 약 $0.03-0.05
- **총합**: 1회 추천당 약 $0.05-0.08

### 월 예상 비용 (예시)
- 학생 30명 × 1회 추천 = $1.50-$2.40
- 재추천 (목표 변경 시) 추가 비용

### 비용 절감 팁
- 레벨테스트 결과는 변하지 않으므로 재분석 불필요
- 목표 변경 시에만 재추천 권장
- OpenAI 사용량 알림 설정 권장 ($10/월 제한)

---

## 📞 지원

### 구현 관련 문의
- GitHub Issues: https://github.com/your-repo/issues
- 이메일: support@your-domain.com

### OpenAI API 관련 문의
- OpenAI 공식 문서: https://platform.openai.com/docs
- OpenAI 지원: https://help.openai.com

---

## 🎉 완료!

모든 단계가 성공적으로 완료되었다면, 앤보임 플래너 프로의 AI 기능을 사용할 준비가 되었습니다!

**다음 기능들을 활용하세요**:
- 📸 레벨테스트 이미지 자동 분석
- 🎯 학생 맞춤형 과정 추천
- 📊 AI 기반 학습 인사이트
- 📅 수강 이력 관리
