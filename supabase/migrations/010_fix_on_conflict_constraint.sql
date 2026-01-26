-- ON CONFLICT 제약조건 오류 해결
-- 2026년 1월 8일

-- students 테이블의 user_id 컬럼에 유니크 제약조건 추가
-- 한 학생은 하나의 user_id만 가져야 함
ALTER TABLE public.students 
ADD CONSTRAINT students_user_id_unique UNIQUE (user_id);

-- 또는 기존 connect_student_with_info 함수에서 ON CONFLICT 절을 수정할 수도 있음
-- 하지만 user_id가 유니크해야 한다는 비즈니스 로직이 맞으므로 제약조건 추가가 올바름