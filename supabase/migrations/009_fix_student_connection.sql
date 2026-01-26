-- 학생 연결 문제 해결을 위한 마이그레이션
-- 2026년 1월 7일

-- 기존 connect_student_with_info 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS connect_student_with_info(TEXT, TEXT, TEXT, TEXT);

-- 수정된 학생 연결 함수
CREATE OR REPLACE FUNCTION connect_student_with_info(
    invite_code_input TEXT,
    student_name TEXT,
    student_phone TEXT,
    student_email TEXT
)
RETURNS json AS $$
DECLARE
    invite_record record;
    new_student_id uuid;
    current_user_id uuid;
BEGIN
    -- 현재 사용자 ID 가져오기
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;

    -- 먼저 student_profiles 테이블에 현재 사용자의 프로필이 없으면 생성
    INSERT INTO public.student_profiles (
        id,
        email,
        full_name,
        phone,
        created_at,
        updated_at
    ) VALUES (
        current_user_id,
        student_email,
        student_name,
        student_phone,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 유효한 초대 코드 찾기 (student_id가 NULL이면 미사용)
    SELECT * INTO invite_record
    FROM public.invite_codes
    WHERE code = invite_code_input
    AND student_id IS NULL
    AND expires_at > NOW();

    IF invite_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid or expired invite code'
        );
    END IF;

    -- students 테이블에 새 학생 추가 또는 업데이트
    INSERT INTO public.students (
        teacher_id,
        user_id,
        name,
        email,
        phone,
        level,
        status,
        is_connected,
        created_at,
        updated_at
    ) VALUES (
        invite_record.teacher_id,
        current_user_id,
        student_name,
        student_email,
        student_phone,
        '1', -- 기본 레벨
        'active',
        true,
        NOW(),
        NOW()
    ) 
    ON CONFLICT (user_id) DO UPDATE SET
        teacher_id = invite_record.teacher_id,
        name = student_name,
        email = student_email,
        phone = student_phone,
        is_connected = true,
        updated_at = NOW()
    RETURNING id INTO new_student_id;

    -- 초대 코드를 현재 학생과 연결
    UPDATE public.invite_codes
    SET student_id = current_user_id,
        used_at = NOW()
    WHERE id = invite_record.id;

    -- student_profiles 테이블 업데이트
    UPDATE public.student_profiles 
    SET planner_id = invite_record.teacher_id,
        full_name = COALESCE(full_name, student_name),
        phone = COALESCE(phone, student_phone),
        updated_at = NOW()
    WHERE id = current_user_id;

    -- 성공 응답 반환
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully connected to planner',
        'teacher_id', invite_record.teacher_id,
        'student_id', new_student_id
    );

EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Connection failed: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION connect_student_with_info(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 학생이 회원가입할 때 자동으로 student_profiles 생성하는 트리거
CREATE OR REPLACE FUNCTION auto_create_student_profile()
RETURNS trigger AS $$
BEGIN
    -- auth.users에 새 사용자가 추가되면 student_profiles 생성
    INSERT INTO public.student_profiles (
        id,
        email,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거는 auth.users 테이블에 직접 적용할 수 없으므로,
-- 대신 RPC 함수를 통해 처리
CREATE OR REPLACE FUNCTION ensure_student_profile()
RETURNS void AS $$
BEGIN
    -- 현재 사용자의 프로필이 없으면 생성
    INSERT INTO public.student_profiles (
        id,
        email,
        created_at,
        updated_at
    ) 
    SELECT 
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.student_profiles WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION ensure_student_profile() TO authenticated;