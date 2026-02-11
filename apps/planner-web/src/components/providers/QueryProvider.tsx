'use client';

import { QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { makeQueryClient } from '@/lib/query-client';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState를 사용하여 QueryClient를 한 번만 생성
  // 이렇게 하면 여러 번 리렌더링되어도 새 인스턴스가 생성되지 않음
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - Development only */}
      {/* {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )} */}
    </QueryClientProvider>
  );
}
