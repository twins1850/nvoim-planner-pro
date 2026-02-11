# TanStack Query v5 사용 가이드

## 🎯 TanStack Query란?

TanStack Query (구 React Query)는 서버 상태 관리를 위한 강력한 라이브러리입니다.

### 주요 기능:
- ✅ **자동 캐싱**: 한 번 가져온 데이터를 5분간 캐싱
- ✅ **중복 제거**: 동일한 쿼리는 한 번만 실행
- ✅ **자동 리페칭**: 필요할 때만 데이터 새로고침
- ✅ **낙관적 업데이트**: 빠른 사용자 경험
- ✅ **DevTools**: 개발자 도구로 쉬운 디버깅

---

## ✅ 설정 완료 상태

✅ TanStack Query v5.85.6 설치됨
✅ QueryProvider 설정 완료
✅ React Query DevTools 설치 완료
✅ 최적화된 캐싱 전략 적용:
  - `staleTime`: 5분 (데이터 신선도)
  - `gcTime`: 30분 (캐시 유지 시간)
  - `refetchOnWindowFocus`: false (윈도우 포커스 시 리페칭 안 함)
  - `retry`: 1 (실패 시 1회만 재시도)

---

## 📖 기본 사용법

### 1. 데이터 조회 (useQuery)

**Before (직접 Supabase 호출):**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error);
      } else {
        setStudents(data || []);
      }
      setLoading(false);
    };

    fetchStudents();
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>에러 발생</div>;

  return <div>{/* 학생 목록 렌더링 */}</div>;
}
```

**After (TanStack Query 사용):**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export default function StudentsPage() {
  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5분간 캐싱
  });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러 발생: {error.message}</div>;

  return <div>{/* 학생 목록 렌더링 */}</div>;
}
```

**장점:**
- ✅ 자동 캐싱 (5분간)
- ✅ 중복 요청 제거
- ✅ 자동 에러 처리
- ✅ 로딩 상태 자동 관리
- ✅ 코드가 더 간결함

---

### 2. 데이터 생성/수정/삭제 (useMutation)

**학생 생성 예제:**

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface NewStudent {
  full_name: string;
  email: string;
  level: string;
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: NewStudent) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_profiles')
        .insert(student)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // 학생 목록 캐시 무효화 (자동으로 다시 가져옴)
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => {
      console.error('학생 생성 실패:', error);
    },
  });
}

// 컴포넌트에서 사용
function CreateStudentForm() {
  const createStudent = useCreateStudent();

  const handleSubmit = async (formData: NewStudent) => {
    try {
      await createStudent.mutateAsync(formData);
      alert('학생 생성 성공!');
    } catch (error) {
      alert('학생 생성 실패');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드 */}
      <button type="submit" disabled={createStudent.isPending}>
        {createStudent.isPending ? '생성 중...' : '학생 생성'}
      </button>
    </form>
  );
}
```

**학생 업데이트 예제:**

```typescript
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Student> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 특정 학생 캐시 업데이트
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', data.id] });
    },
  });
}
```

**학생 삭제 예제:**

```typescript
export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('student_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
```

---

### 3. 낙관적 업데이트 (Optimistic Updates)

사용자 경험을 향상시키기 위해 서버 응답을 기다리지 않고 즉시 UI를 업데이트:

```typescript
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Student> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // 낙관적 업데이트
    onMutate: async ({ id, updates }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['students'] });

      // 이전 데이터 스냅샷 저장
      const previousStudents = queryClient.getQueryData(['students']);

      // 낙관적으로 캐시 업데이트
      queryClient.setQueryData(['students'], (old: Student[]) =>
        old.map((student) =>
          student.id === id ? { ...student, ...updates } : student
        )
      );

      // 롤백을 위해 이전 데이터 반환
      return { previousStudents };
    },
    // 에러 시 롤백
    onError: (err, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['students'], context.previousStudents);
      }
    },
    // 성공 시 서버 데이터로 갱신
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
```

---

### 4. 페이지네이션

```typescript
export function useStudentsPagination(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['students', page, pageSize],
    queryFn: async () => {
      const supabase = createClient();
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact' })
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { students: data || [], total: count || 0 };
    },
    placeholderData: (previousData) => previousData, // 이전 데이터 유지
  });
}
```

---

### 5. 무한 스크롤

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useStudentsInfinite(pageSize: number) {
  return useInfiniteQuery({
    queryKey: ['students', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const start = pageParam * pageSize;
      const end = start + pageSize - 1;

      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === pageSize ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
}

// 컴포넌트에서 사용
function StudentsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStudentsInfinite(20);

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </React.Fragment>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
```

---

## 🛠️ React Query DevTools 사용법

개발 모드에서 자동으로 우측 하단에 React Query 아이콘이 표시됩니다.

### DevTools 기능:
1. **Query 목록**: 모든 active/inactive 쿼리 확인
2. **Query 상태**: fetching, fresh, stale 상태 확인
3. **캐시 데이터**: 현재 캐시된 데이터 확인
4. **수동 리페칭**: 버튼 클릭으로 쿼리 다시 실행
5. **캐시 초기화**: 특정 쿼리 캐시 삭제

---

## 📊 쿼리 키 (Query Key) 패턴

쿼리 키는 배열 형태로 작성하며, 계층적으로 구성:

```typescript
// ✅ 좋은 패턴
['students'] // 모든 학생
['students', studentId] // 특정 학생
['students', { status: 'active' }] // 필터링된 학생
['lessons', { studentId: '123' }] // 특정 학생의 수업

// ❌ 나쁜 패턴
['getStudents'] // 동사 사용 (X)
['student_123'] // 문자열로 ID 포함 (X)
```

---

## 🎯 마이그레이션 우선순위

TanStack Query로 마이그레이션할 컴포넌트 우선순위:

### 높은 우선순위 (즉시 마이그레이션):
1. **StudentsContent.tsx** - 자주 조회되는 학생 목록
2. **LessonsContent.tsx** - 자주 조회되는 수업 목록
3. **DashboardContent.tsx** - 대시보드 통계

### 중간 우선순위:
4. **StudentDetailContent.tsx** - 학생 상세 정보
5. **LessonDetailContent.tsx** - 수업 상세 정보

### 낮은 우선순위:
6. **HomeworkContent.tsx** - 숙제 관리
7. **MessagesContent.tsx** - 메시지 목록

---

## ⚠️ 주의사항

1. **Server Components와 함께 사용 불가**:
   - TanStack Query는 Client Components에서만 사용 가능
   - `'use client'` 지시어 필요

2. **쿼리 키 일관성**:
   - 같은 데이터는 항상 같은 쿼리 키 사용
   - 쿼리 키가 다르면 별도의 캐시로 관리됨

3. **캐시 무효화**:
   - 데이터 수정 후 `invalidateQueries` 호출 필수
   - 그렇지 않으면 오래된 데이터 표시됨

---

## 📚 참고 자료

- [TanStack Query v5 공식 문서](https://tanstack.com/query/latest)
- [마이그레이션 가이드 (v4 → v5)](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [DevTools 사용법](https://tanstack.com/query/latest/docs/framework/react/devtools)

---

**이제 TanStack Query를 사용하여 데이터 페칭을 최적화할 준비가 완료되었습니다!**
