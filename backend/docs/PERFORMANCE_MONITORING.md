# 성능 모니터링 시스템

앤보임 영어회화 관리 시스템의 실시간 성능 모니터링 및 최적화 시스템입니다.

## 📋 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [시스템 구성](#시스템-구성)
- [API 문서](#api-문서)
- [실시간 모니터링](#실시간-모니터링)
- [성능 최적화](#성능-최적화)
- [알림 시스템](#알림-시스템)
- [성능 테스트](#성능-테스트)
- [문제 해결](#문제-해결)

## 개요

성능 모니터링 시스템은 다음과 같은 목적으로 구축되었습니다:

- **실시간 성능 지표 수집**: CPU, 메모리, 응답 시간 등 시스템 성능 지표를 실시간으로 수집
- **자동 성능 최적화**: 성능 임계값 초과 시 자동 최적화 실행
- **예측적 알림**: 성능 문제를 사전에 감지하고 알림 발송
- **성능 대시보드**: 직관적인 웹 기반 성능 모니터링 대시보드
- **히스토리 분석**: 성능 트렌드 분석 및 보고서 생성

## 주요 기능

### 1. 실시간 성능 지표 수집

- **시스템 메트릭**: CPU 사용률, 메모리 사용률, Event Loop 지연
- **애플리케이션 메트릭**: 응답 시간, 요청 처리율, 오류율
- **외부 서비스 메트릭**: Redis 연결 수, 데이터베이스 연결 상태
- **커스텀 메트릭**: 비즈니스 로직별 성능 지표

### 2. 지능형 캐싱 시스템

- **L1/L2 캐시 전략**: 로컬 메모리 + Redis 2단계 캐싱
- **태그 기반 무효화**: 관련 데이터 변경 시 자동 캐시 무효화
- **적응형 TTL**: 사용 패턴에 따른 동적 캐시 만료 시간 조정
- **캐시 성능 분석**: 적중률, 미스율, 성능 통계 제공

### 3. 메모리 최적화

- **객체 풀링**: 자주 사용되는 객체의 재사용을 통한 GC 압박 감소
- **스트림 기반 처리**: 대용량 데이터의 메모리 효율적 처리
- **메모리 누수 감지**: 자동 메모리 누수 탐지 및 알림
- **긴급 정리**: 메모리 압박 시 자동 정리 작업 실행

### 4. 알림 및 모니터링

- **실시간 알림**: 성능 임계값 초과 시 즉시 알림
- **예측적 알림**: 성능 트렌드 분석을 통한 사전 알림
- **다양한 알림 채널**: 웹 소켓, 이메일, Slack (확장 가능)
- **알림 쿨다운**: 중복 알림 방지를 위한 지능형 쿨다운

## 시스템 구성

```
├── services/
│   ├── performanceMonitoringService.ts     # 핵심 모니터링 서비스
│   ├── performanceOptimizationService.ts   # 성능 최적화 서비스
│   ├── cacheStrategyService.ts             # 캐싱 전략 서비스
│   ├── memoryOptimizationService.ts        # 메모리 최적화 서비스
│   └── performanceSocketService.ts         # 실시간 소켓 서비스
├── controllers/
│   └── performanceController.ts            # 성능 API 컨트롤러
├── routes/
│   └── performanceRoutes.ts                # 성능 API 라우트
├── middleware/
│   └── responseTimeOptimizer.ts            # 응답 시간 최적화 미들웨어
└── performance-tests/                      # 성능 테스트 설정
```

## API 문서

### 인증

모든 성능 API는 JWT 토큰 인증이 필요하며, `admin` 또는 `planner` 권한이 있어야 합니다.

```bash
# 인증 헤더
Authorization: Bearer <JWT_TOKEN>
```

### 주요 엔드포인트

#### 1. 헬스 체크 (인증 불필요)

```http
GET /api/performance/health
```

**응답:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:30:00.000Z",
    "uptime": 86400,
    "memory": {
      "used": 128,
      "total": 512,
      "usage": 25
    }
  }
}
```

#### 2. 현재 성능 지표

```http
GET /api/performance/metrics/current
```

**응답:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "cpuUsage": {
      "user": 45000000,
      "system": 12000000
    },
    "memoryUsage": {
      "rss": 134217728,
      "heapTotal": 67108864,
      "heapUsed": 45678912,
      "external": 8765432,
      "arrayBuffers": 1234567
    },
    "eventLoopDelay": 2.5,
    "activeHandles": 15,
    "activeRequests": 3,
    "uptime": 86400,
    "requestsPerSecond": 25.4,
    "errorRate": 0.02
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

#### 3. 성능 히스토리

```http
GET /api/performance/metrics/history?period=hourly
```

**매개변수:**
- `period`: `hourly` | `daily` | `weekly` (기본값: hourly)

#### 4. 대시보드 데이터

```http
GET /api/performance/dashboard
```

**응답:**
```json
{
  "success": true,
  "data": {
    "current": { /* 현재 메트릭 */ },
    "history": {
      "hourly": [ /* 시간별 히스토리 */ ],
      "daily": [ /* 일별 히스토리 */ ],
      "weekly": [ /* 주별 히스토리 */ ]
    },
    "alerts": [ /* 최근 알림 목록 */ ],
    "status": "healthy",
    "trends": {
      "memoryTrend": "stable",
      "memoryChange": "+2.5%"
    },
    "recommendations": [
      "메모리 사용률이 안정적입니다.",
      "캐시 적중률이 우수합니다."
    ]
  }
}
```

#### 5. 캐시 통계

```http
GET /api/performance/cache
```

#### 6. 메모리 통계

```http
GET /api/performance/memory
```

#### 7. 종합 성능 보고서

```http
GET /api/performance/report
```

### 관리자 전용 API

#### 8. 성능 임계값 설정

```http
PUT /api/performance/thresholds
Content-Type: application/json

{
  "thresholds": {
    "responseTime": { "warning": 1000, "critical": 5000 },
    "memoryUsage": { "warning": 0.8, "critical": 0.9 },
    "cpuUsage": { "warning": 0.7, "critical": 0.9 },
    "eventLoopDelay": { "warning": 10, "critical": 50 },
    "errorRate": { "warning": 0.05, "critical": 0.1 }
  }
}
```

#### 9. 성능 최적화 실행

```http
POST /api/performance/optimize
Content-Type: application/json

{
  "type": "all"  // "all" | "cache" | "memory" | "cleanup"
}
```

## 실시간 모니터링

### Socket.io 연결

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// 성능 메트릭 구독
socket.emit('subscribe:metrics');
socket.on('metrics:update', (data) => {
  console.log('실시간 성능 지표:', data);
});

// 알림 구독
socket.emit('subscribe:alerts');
socket.on('alert:new', (alert) => {
  console.log('새로운 성능 알림:', alert);
});

// 크리티컬 알림
socket.on('alert:critical', (alert) => {
  console.error('크리티컬 알림:', alert);
});
```

### 사용 가능한 이벤트

**클라이언트 → 서버:**
- `subscribe:metrics` - 실시간 메트릭 구독
- `subscribe:alerts` - 알림 구독
- `unsubscribe:metrics` - 메트릭 구독 해제
- `unsubscribe:alerts` - 알림 구독 해제
- `request:history` - 히스토리 데이터 요청
- `request:dashboard` - 대시보드 데이터 요청

**서버 → 클라이언트:**
- `metrics:update` - 실시간 메트릭 업데이트
- `alert:new` - 새로운 알림
- `alert:critical` - 크리티컬 알림
- `history:data` - 히스토리 데이터
- `dashboard:data` - 대시보드 데이터

## 성능 최적화

### 자동 최적화 기능

1. **캐시 최적화**
   - 자주 사용되는 데이터 자동 캐싱
   - 사용 패턴 분석을 통한 TTL 조정
   - 메모리 압박 시 캐시 크기 조정

2. **메모리 최적화**
   - 객체 풀 크기 동적 조정
   - 메모리 압박 시 긴급 정리 실행
   - 가비지 컬렉션 최적화

3. **데이터베이스 최적화**
   - 느린 쿼리 자동 감지 및 최적화
   - 커넥션 풀 크기 조정
   - 인덱스 사용량 모니터링

### 수동 최적화

```bash
# 전체 최적화 실행
curl -X POST http://localhost:3000/api/performance/optimize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'

# 캐시만 최적화
curl -X POST http://localhost:3000/api/performance/optimize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type": "cache"}'
```

## 알림 시스템

### 알림 유형

1. **성능 알림**: 임계값 초과 시 발송
2. **예측적 알림**: 트렌드 분석을 통한 사전 알림
3. **크리티컬 알림**: 시스템 위험 상황 시 즉시 발송

### 알림 설정

```javascript
// 알림 설정 예시
const alertConfigs = [
  {
    metric: 'responseTime',
    threshold: 2000,
    operator: 'gt',
    enabled: true,
    cooldown: 300, // 5분
    recipients: ['admin@example.com']
  },
  {
    metric: 'memoryUsage',
    threshold: 0.9,
    operator: 'gt',
    enabled: true,
    cooldown: 600, // 10분
    recipients: ['devops@example.com']
  }
];
```

## 성능 테스트

### Artillery를 사용한 성능 테스트

```bash
# 성능 모니터링 API 테스트
npm run performance:monitoring

# 개발 환경에서 테스트
npm run performance:monitoring:dev

# 성능 보고서 생성
npm run performance:report
```

### 테스트 시나리오

1. **기본 성능 테스트**: API 응답 시간 및 처리량 측정
2. **캐시 성능 테스트**: 캐시 적중률 및 성능 측정
3. **메모리 사용량 테스트**: 메모리 사용 패턴 분석
4. **고빈도 요청 테스트**: 실시간 메트릭 API 부하 테스트

### 성능 기준

- **응답 시간**: 평균 < 500ms, 최대 < 2000ms
- **처리량**: > 100 requests/second
- **오류율**: < 1%
- **메모리 사용률**: < 80%
- **캐시 적중률**: > 90%

## 문제 해결

### 자주 발생하는 문제

#### 1. 높은 메모리 사용률

**증상**: 메모리 사용률이 80% 이상 지속

**해결방법**:
```bash
# 메모리 통계 확인
curl http://localhost:3000/api/performance/memory

# 긴급 정리 실행
curl -X POST http://localhost:3000/api/performance/optimize \
  -d '{"type": "cleanup"}'
```

#### 2. 느린 응답 시간

**증상**: API 응답 시간이 2초 이상

**해결방법**:
```bash
# 응답 시간 통계 확인
curl http://localhost:3000/api/performance/response-time

# 캐시 최적화 실행
curl -X POST http://localhost:3000/api/performance/optimize \
  -d '{"type": "cache"}'
```

#### 3. 높은 Event Loop 지연

**증상**: Event Loop 지연이 10ms 이상

**해결방법**:
- CPU 집약적인 작업 확인
- 동기적 코드 비동기로 변경
- 작업 분할 및 setImmediate 사용

### 로그 분석

성능 관련 로그는 다음 위치에서 확인할 수 있습니다:

```bash
# 성능 모니터링 로그
tail -f logs/performance.log

# 에러 로그
tail -f logs/error.log

# 전체 애플리케이션 로그
tail -f logs/combined.log
```

### 모니터링 대시보드 접근

실시간 성능 대시보드는 웹 인터페이스를 통해 접근할 수 있습니다:

1. 관리자 계정으로 로그인
2. `/performance/dashboard` 페이지 이동
3. 실시간 성능 지표 및 알림 확인

## 추가 자료

- [성능 최적화 가이드](./PERFORMANCE_OPTIMIZATION.md)
- [캐싱 전략 문서](./CACHING_STRATEGY.md)
- [메모리 관리 가이드](./MEMORY_MANAGEMENT.md)
- [트러블슈팅 가이드](./TROUBLESHOOTING.md)

## 기여하기

성능 모니터링 시스템 개선에 기여하려면:

1. 이슈 생성 또는 기존 이슈 확인
2. 개발 브랜치에서 작업
3. 성능 테스트 실행 및 통과 확인
4. Pull Request 생성

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.