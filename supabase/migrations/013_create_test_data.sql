-- 테스트 데이터 생성
-- 2026년 1월 8일

-- 테스트 교사 계정이 students 테이블에 있는지 확인하고, 학생 데이터 생성
DO $$
DECLARE
    teacher_user_id uuid;
    student_user_id uuid;
BEGIN
    -- teacher@test.com 사용자 ID 찾기
    SELECT id INTO teacher_user_id FROM auth.users WHERE email = 'teacher@test.com';
    
    -- student@test.com 사용자 ID 찾기  
    SELECT id INTO student_user_id FROM auth.users WHERE email = 'student@test.com';
    
    -- 교사와 학생 계정이 모두 존재하는 경우에만 테스트 데이터 생성
    IF teacher_user_id IS NOT NULL AND student_user_id IS NOT NULL THEN
        
        -- students 테이블에 연결된 학생 데이터 생성 (중복 방지)
        INSERT INTO public.students (
            teacher_id,
            user_id,
            name,
            email,
            is_connected,
            created_at,
            updated_at
        ) VALUES (
            teacher_user_id,
            student_user_id, 
            '김학생',
            'student@test.com',
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            teacher_id = teacher_user_id,
            name = '김학생',
            email = 'student@test.com',
            is_connected = true,
            updated_at = NOW();
        
        RAISE NOTICE '테스트 데이터가 성공적으로 생성되었습니다. 교사: %, 학생: %', teacher_user_id, student_user_id;
    ELSE
        RAISE NOTICE '필요한 사용자 계정이 없습니다. 교사: %, 학생: %', teacher_user_id, student_user_id;
    END IF;
END $$;