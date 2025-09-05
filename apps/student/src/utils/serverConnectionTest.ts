import { supabase } from '../lib/supabase';

/**
 * Supabase 연결 테스트 함수
 * Supabase에 간단한 요청을 보내고 응답을 확인합니다.
 */
export const testServerConnection = async (): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    console.log('Supabase 연결 테스트 시작...');
    
    // Supabase 연결 상태 확인 (간단한 쿼리 실행)
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase 연결 오류:', error);
      return {
        success: false,
        message: `Supabase 연결 실패: ${error.message}`
      };
    }
    
    console.log('Supabase 연결 성공');
    
    return {
      success: true,
      message: 'Supabase 연결 성공!',
      data: { connected: true, timestamp: new Date().toISOString() }
    };
  } catch (error: any) {
    console.error('Supabase 연결 테스트 실패:', error);
    
    let errorMessage = 'Supabase 연결 실패';
    
    if (error.message) {
      errorMessage = `Supabase 오류: ${error.message}`;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Supabase 연결 시간 초과';
    } else if (error.message?.includes('Network Error')) {
      errorMessage = '네트워크 오류 발생';
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
};

/**
 * Supabase 인증 상태 테스트 함수
 * 현재 사용자 인증 상태를 확인합니다.
 */
export const testApiEndpoint = async (): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    console.log('Supabase 인증 상태 테스트 시작...');
    
    // 현재 사용자 인증 상태 확인
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('인증 상태 확인 오류:', error);
      return {
        success: false,
        message: `인증 상태 확인 실패: ${error.message}`
      };
    }
    
    if (!user) {
      return {
        success: false,
        message: '로그인이 필요합니다.'
      };
    }
    
    console.log('인증 상태 확인 성공:', user.email);
    
    return {
      success: true,
      message: '인증 상태 확인 성공!',
      data: { 
        authenticated: true, 
        user: { 
          id: user.id, 
          email: user.email 
        }, 
        timestamp: new Date().toISOString() 
      }
    };
  } catch (error: any) {
    console.error('인증 상태 테스트 실패:', error);
    
    let errorMessage = '인증 상태 확인 실패';
    
    if (error.message) {
      errorMessage = `인증 오류: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
};