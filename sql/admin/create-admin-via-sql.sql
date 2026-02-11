-- 새 관리자 계정 만들기
-- 이메일: admin@nvoim.com
-- 비밀번호: kjrkzo1002#

-- 1. 먼저 auth.users에 사용자 생성
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@nvoim.com',
  crypt('kjrkzo1002#', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- 2. profiles 테이블에 관리자 프로필 생성
-- (위에서 반환된 ID를 사용해야 하므로 수동으로 실행 필요)
-- INSERT INTO public.profiles (id, role, full_name, email, is_active)
-- VALUES ('[위에서 생성된 ID]', 'admin', 'Administrator', 'admin@nvoim.com', true);
