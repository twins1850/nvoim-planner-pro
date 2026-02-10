-- ============================================================================
-- profiles 테이블 UPSERT 수정
-- 작성일: 2026.02.06
-- 목적: 학생 연결 시 profiles 테이블에 레코드가 없으면 생성하도록 수정
-- ============================================================================

DROP FUNCTION IF EXISTS connect_student_with_info(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION connect_student_with_info(
    invite_code_input TEXT,
    student_name TEXT,
    student_phone TEXT,
    student_email TEXT
)
RETURNS json AS $$
DECLARE
    target_planner_id UUID;
    active_license_record RECORD;
    current_student_count INTEGER;
    current_user_id UUID;
BEGIN
    -- 1. 현재 사용자 ID 가져오기
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;

    -- 2. planner_profiles에서 초대코드로 플래너 찾기
    SELECT id INTO target_planner_id
    FROM public.planner_profiles
    WHERE invite_code = invite_code_input;

    IF target_planner_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid invite code'
        );
    END IF;

    -- 3. 플래너의 활성 라이선스 확인
    SELECT * INTO active_license_record
    FROM public.licenses
    WHERE planner_id = target_planner_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- 라이선스 없음
    IF active_license_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Planner license not found or expired'
        );
    END IF;

    -- 라이선스 만료 확인
    IF active_license_record.expires_at IS NOT NULL AND active_license_record.expires_at < NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Planner license has expired'
        );
    END IF;

    -- 4. 현재 학생 수 카운트
    SELECT COUNT(*) INTO current_student_count
    FROM public.student_profiles
    WHERE planner_id = target_planner_id;

    -- 5. 학생수 제한 체크 (실시간 차단)
    IF current_student_count >= active_license_record.max_students THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Planner has reached maximum student capacity (' ||
                       active_license_record.max_students || ' students)',
            'current_count', current_student_count,
            'max_students', active_license_record.max_students
        );
    END IF;

    -- 6. student_profiles에 플래너 연결 및 학생 정보 업데이트
    INSERT INTO public.student_profiles (
        id,
        planner_id,
        full_name,
        email,
        phone,
        level,
        created_at,
        updated_at
    ) VALUES (
        current_user_id,
        target_planner_id,
        student_name,
        student_email,
        student_phone,
        '1',  -- 기본 레벨
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        planner_id = target_planner_id,
        full_name = student_name,
        email = student_email,
        phone = student_phone,
        level = '1',
        updated_at = NOW();

    -- 7. profiles 테이블도 UPSERT (레코드 없으면 생성, 있으면 업데이트)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        created_at,
        updated_at
    ) VALUES (
        current_user_id,
        student_email,
        student_name,
        student_phone,
        'student',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(student_email, profiles.email),
        full_name = COALESCE(student_name, profiles.full_name),
        phone = COALESCE(student_phone, profiles.phone),
        updated_at = NOW();

    -- 8. 성공 응답 반환
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully connected to planner',
        'planner_id', target_planner_id,
        'student_count', current_student_count + 1,
        'max_students', active_license_record.max_students,
        'remaining_slots', active_license_record.max_students - current_student_count - 1
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

-- ============================================================================
-- 완료 메시지
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Student connection function updated with profiles UPSERT';
    RAISE NOTICE '📊 Now properly creates profiles entry if it doesn't exist';
    RAISE NOTICE '🔒 License-based student limit: Real-time blocking enabled';
END $$;
