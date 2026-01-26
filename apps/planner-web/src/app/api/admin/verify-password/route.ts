import { NextRequest, NextResponse } from 'next/server';

/**
 * 관리자 비밀번호 검증 API
 *
 * 간단한 비밀번호 프롬프트 기반 인증을 제공합니다.
 * 환경 변수 ADMIN_PASSWORD와 사용자 입력을 비교합니다.
 *
 * @param req - POST 요청 { password: string }
 * @returns 200 OK 또는 401 Unauthorized
 */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    // 환경 변수에서 관리자 비밀번호 가져오기
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD 환경 변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버 설정 오류: 관리자 비밀번호가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 비밀번호 확인
    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }

    // 비밀번호 불일치
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('비밀번호 검증 오류:', error);
    return NextResponse.json(
      { error: '비밀번호 검증 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
