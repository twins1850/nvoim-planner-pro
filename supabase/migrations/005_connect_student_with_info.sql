-- 학생 정보와 함께 초대 코드 연결 함수
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

    -- students 테이블에 새 학생 추가
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
    ) RETURNING id INTO new_student_id;

    -- 초대 코드를 현재 학생과 연결
    UPDATE public.invite_codes
    SET student_id = current_user_id,
        used_at = NOW()
    WHERE id = invite_record.id;

    -- student_profiles 테이블에도 플래너 정보 업데이트 (있다면)
    UPDATE public.student_profiles 
    SET planner_id = invite_record.teacher_id,
        updated_at = NOW()
    WHERE id = current_user_id;

    -- student_profiles가 없다면 생성
    INSERT INTO public.student_profiles (
        id,
        email,
        full_name,
        phone,
        level,
        planner_id,
        created_at,
        updated_at
    ) VALUES (
        current_user_id,
        student_email,
        student_name,
        student_phone,
        '1',
        invite_record.teacher_id,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        planner_id = invite_record.teacher_id,
        full_name = student_name,
        phone = student_phone,
        level = '1',
        updated_at = NOW();

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