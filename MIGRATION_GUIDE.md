# create_invite_code 함수 마이그레이션 가이드

## 문제 상황

통합 테스트 `06-invite-code-flow.spec.ts` 실행 시 초대 코드 생성이 실패하는 문제가 발생했습니다.

**원인**: `create_invite_code` PostgreSQL 함수가 Supabase 데이터베이스에 없음

## 해결 방법

아래 SQL을 Supabase Dashboard의 SQL Editor에서 실행하세요.

### 1. Supabase Dashboard 접속

URL: https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new

### 2. 아래 SQL을 복사해서 실행

```sql
-- Create function to generate and store invite code for planners
-- This function generates a 6-character alphanumeric code and stores it in planner_profiles

CREATE OR REPLACE FUNCTION create_invite_code()
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_invite_code TEXT;
  v_characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code_exists BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Generate unique invite code (retry if collision)
  LOOP
    v_invite_code := '';
    FOR i IN 1..6 LOOP
      v_invite_code := v_invite_code || substr(v_characters, floor(random() * length(v_characters) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM planner_profiles WHERE invite_code = v_invite_code
    ) INTO v_code_exists;

    EXIT WHEN NOT v_code_exists;
  END LOOP;

  -- Update planner_profiles with new invite code
  UPDATE planner_profiles
  SET
    invite_code = v_invite_code,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Planner profile not found'
    );
  END IF;

  -- Return success with code
  RETURN json_build_object(
    'success', true,
    'code', v_invite_code,
    'message', 'Invite code generated successfully'
  );

EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to generate invite code: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invite_code() TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_invite_code() IS 'Generates a unique 6-character invite code and stores it in planner_profiles for the authenticated planner';
```

### 3. 실행 확인

SQL 실행 후 "Success" 메시지가 표시되면 완료입니다.

### 4. 테스트 재실행

마이그레이션 적용 후 통합 테스트를 다시 실행하세요:

```bash
cd apps/planner-web
npm run test:integration:headed -- tests/integration/06-invite-code-flow.spec.ts --grep "Complete flow"
```

## 시도한 자동화 방법들

다음 방법들을 시도했으나 기술적 제약으로 인해 실패했습니다:

1. ❌ **Playwright MCP + Supabase Dashboard**
   - 문제: 백그라운드 쿼리 팝업이 계속 나타나 결과 확인 불가
   - Monaco editor에 SQL 입력 성공했으나 실행 결과 불확실

2. ❌ **Supabase CLI (`supabase db push`)**
   - 문제: 마이그레이션 히스토리 추적 실패
   - 이미 적용된 마이그레이션을 다시 적용하려다 에러 발생
   - `CREATE POLICY` 중복 에러 (002_student_profiles.sql)

3. ❌ **PostgreSQL 직접 연결 (pg 패키지)**
   - 문제: 데이터베이스 비밀번호가 환경 변수에 없음
   - `.env.local`에 DB 연결 정보 부재

4. ❌ **psql CLI**
   - 문제: psql이 설치되어 있지 않음

## 결론

여러 자동화 방법을 시도했으나, 가장 확실하고 빠른 방법은 **Supabase Dashboard에서 수동으로 SQL을 실행**하는 것입니다.

이 방법은:
- ✅ 가장 안정적 (100% 확실)
- ✅ 가장 빠름 (1-2분 소요)
- ✅ 추가 도구 설치 불필요
- ✅ 권한 문제 없음

---

**작성일**: 2026년 2월 2일
**작성자**: Claude Code Assistant (자동화 시도 및 문서화)
