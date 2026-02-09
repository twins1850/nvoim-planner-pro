'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          문제가 발생했습니다
        </h2>
        <p className="text-gray-600 mb-6">
          일시적인 오류가 발생했습니다. 다시 시도해 주세요.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
