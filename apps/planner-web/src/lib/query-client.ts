import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 데이터가 5분간 신선한 상태로 유지
        staleTime: 1000 * 60 * 5, // 5 minutes

        // 캐시에 30분간 데이터 유지
        gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)

        // 윈도우 포커스 시 자동 리페칭 비활성화
        refetchOnWindowFocus: false,

        // 재연결 시 자동 리페칭 비활성화
        refetchOnReconnect: false,

        // 실패 시 재시도 1회만
        retry: 1,
      },
      mutations: {
        // Mutation 실패 시 재시도 안 함
        retry: false,
      },
    },
  });
}
