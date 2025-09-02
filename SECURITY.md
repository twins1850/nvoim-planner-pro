# 🔒 보안 가이드

## 📌 개요

앤보임 영어회화 관리 시스템의 보안 설정 및 모범 사례를 설명합니다.

## 🔐 환경 변수 보안

### 시크릿 생성 방법

#### JWT Secret 생성
```bash
# 강력한 랜덤 시크릿 생성 (64바이트)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 또는 OpenSSL 사용
openssl rand -hex 64
```

#### 세션 시크릿 생성
```bash
# 32바이트 시크릿 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 환경 변수 관리

#### 개발 환경
1. `.env` 파일 사용
2. `.env`는 절대 Git에 커밋하지 않음
3. `.env.example`을 참고하여 설정

#### 프로덕션 환경
1. AWS Secrets Manager 또는 Azure Key Vault 사용
2. 환경 변수로 주입
3. IAM Role 기반 인증 사용

```bash
# AWS Secrets Manager 예시
aws secretsmanager create-secret \
  --name nvoim/production/api-keys \
  --secret-string file://secrets.json
```

## 🛡️ API 보안

### 인증 및 권한

#### JWT 토큰 관리
- Access Token: 24시간 유효
- Refresh Token: 7일 유효
- 토큰 갱신 로직 구현

```typescript
// 토큰 검증 미들웨어
app.use('/api/protected', authenticateToken);
```

### Rate Limiting
```typescript
// 기본 설정: 15분당 100 요청
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

### CORS 설정
```typescript
const corsOptions = {
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
```

## 🔒 데이터 보안

### 암호화

#### 비밀번호 해싱
```typescript
// bcrypt 사용 (salt rounds: 12)
const hashedPassword = await bcrypt.hash(password, 12);
```

#### 민감 데이터 암호화
```typescript
// AES-256-GCM 암호화
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

### 데이터베이스 보안

#### MongoDB
- 연결 시 TLS/SSL 사용
- IP 화이트리스트 설정
- 최소 권한 원칙 적용

```javascript
// MongoDB 연결 옵션
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true,
  authSource: 'admin'
}
```

#### Redis
- 비밀번호 설정
- TLS 연결 사용
- AOF 백업 활성화

## 📁 파일 업로드 보안

### 파일 검증
```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
const maxSize = 100 * 1024 * 1024; // 100MB

// 파일 타입 검증
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// 파일 크기 검증
if (file.size > maxSize) {
  throw new Error('File too large');
}
```

### 파일명 살균
```typescript
// 파일명 살균
const sanitizedFilename = filename
  .replace(/[^a-zA-Z0-9.-]/g, '_')
  .substring(0, 255);
```

## 🚨 보안 체크리스트

### 개발 단계
- [ ] 환경 변수 분리 (.env, .env.example)
- [ ] 시크릿 강도 검증
- [ ] 의존성 취약점 검사 (`npm audit`)
- [ ] 코드 내 하드코딩된 시크릿 검사

### 배포 전
- [ ] HTTPS 설정
- [ ] 보안 헤더 설정 (Helmet.js)
- [ ] SQL/NoSQL 인젝션 방지
- [ ] XSS 방지
- [ ] CSRF 토큰 구현

### 운영 중
- [ ] 정기적인 보안 업데이트
- [ ] 로그 모니터링
- [ ] 침입 탐지 시스템
- [ ] 정기적인 백업

## 🔍 보안 감사

### 자동화된 보안 검사
```bash
# npm 의존성 검사
npm audit

# 보안 취약점 자동 수정
npm audit fix

# 강제 수정 (주의 필요)
npm audit fix --force
```

### 보안 테스트
```bash
# OWASP ZAP 스캔
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-api-endpoint.com

# 침투 테스트 도구
npm install -g snyk
snyk test
```

## 📊 보안 모니터링

### Sentry 설정
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app })
  ],
  tracesSampleRate: 0.1
});
```

### 로그 관리
```typescript
// Winston 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});
```

## 🚫 보안 위반 대응

### 침해 발생 시
1. 즉시 영향받은 시스템 격리
2. 모든 API 키 및 시크릿 교체
3. 감사 로그 분석
4. 사용자에게 통지
5. 보안 패치 적용

### 연락처
- 보안 이슈 신고: security@nvoim.com
- 긴급 연락처: +82-10-XXXX-XXXX
- 버그 바운티 프로그램: https://nvoim.com/security/bug-bounty

## 📚 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js 보안 체크리스트](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [MongoDB 보안 가이드](https://docs.mongodb.com/manual/security/)
- [AWS 보안 모범 사례](https://aws.amazon.com/security/best-practices/)

---

*마지막 업데이트: 2024년 12월 20일*
*작성자: 앤보임 보안팀*