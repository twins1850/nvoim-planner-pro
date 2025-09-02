import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Express, Request, Response, NextFunction } from 'express';
import { logWithContext } from '../utils/logger';
import crypto from 'crypto';
import { AppError, ErrorType } from '../middleware/errorHandler';

/**
 * 보안 설정을 적용하는 함수
 * @param app Express 애플리케이션
 */
export function applySecurityConfig(app: Express): void {
    // 1. 보안 헤더 설정 (Helmet)
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'blob:'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            xssFilter: true,
            noSniff: true,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            hsts: {
                maxAge: 31536000, // 1년
                includeSubDomains: true,
                preload: true,
            },
        })
    );

    // 2. CORS 설정
    app.use(
        cors({
            origin: process.env.NODE_ENV === 'production'
                ? [
                    process.env.FRONTEND_URL || 'https://app.anboim.com',
                    process.env.PLANNER_APP_URL || 'https://planner.anboim.com',
                    process.env.STUDENT_APP_URL || 'https://student.anboim.com',
                ]
                : '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
            exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
            credentials: true,
            maxAge: 86400, // 24시간 (CORS preflight 요청 캐싱)
        })
    );

    // 3. 일반 Rate Limiting 설정
    const apiLimiter = rateLimit({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15분
        max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // IP당 최대 요청 수
        standardHeaders: true,
        legacyHeaders: false,
        message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        handler: (req, res) => {
            logWithContext('warn', 'Rate limit exceeded', {
                ip: req.ip,
                url: req.originalUrl,
                method: req.method,
            });

            res.status(429).json({
                success: false,
                error: {
                    type: 'RATE_LIMIT_ERROR',
                    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
                    requestId: req.headers['x-request-id'] || '',
                },
                timestamp: new Date().toISOString()
            });
        }
    });

    // 4. 인증 엔드포인트 특별 Rate Limiting (브루트포스 방지)
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15분
        max: 10, // IP당 최대 요청 수 (로그인 시도 제한)
        standardHeaders: true,
        legacyHeaders: false,
        message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
        handler: (req, res) => {
            logWithContext('warn', 'Auth rate limit exceeded - possible brute force attempt', {
                ip: req.ip,
                url: req.originalUrl,
                method: req.method,
            });

            res.status(429).json({
                success: false,
                error: {
                    type: 'RATE_LIMIT_ERROR',
                    message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
                    requestId: req.headers['x-request-id'] || '',
                },
                timestamp: new Date().toISOString()
            });
        }
    });

    // API 경로에 rate limiting 적용
    app.use('/api', apiLimiter);

    // 인증 경로에 더 엄격한 rate limiting 적용
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/reset-password', authLimiter);

    // 5. 추가 보안 헤더
    app.use((req: Request, res: Response, next: NextFunction) => {
        // 캐시 제어 (민감한 데이터에 대한 브라우저 캐싱 방지)
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');

        // 클릭재킹 방지
        res.setHeader('X-Frame-Options', 'DENY');

        // MIME 타입 스니핑 방지
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // XSS 보호
        res.setHeader('X-XSS-Protection', '1; mode=block');

        next();
    });
}

/**
 * 데이터 암호화 유틸리티
 */
export class Encryption {
    private static algorithm = 'aes-256-gcm';
    private static keyLength = 32; // 256 bits
    private static ivLength = 16; // 128 bits
    private static tagLength = 16; // 128 bits
    private static encryptionKey: Buffer;

    /**
     * 암호화 모듈 초기화
     */
    static initialize(): void {
        // 환경 변수에서 암호화 키 가져오기 또는 생성
        const key = process.env.ENCRYPTION_KEY;

        if (key) {
            // 환경 변수에서 키 사용
            this.encryptionKey = Buffer.from(key, 'hex');

            // 키 길이 확인
            if (this.encryptionKey.length !== this.keyLength) {
                throw new Error('Invalid encryption key length');
            }
        } else {
            // 개발 환경에서만 자동 생성 허용
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Encryption key must be provided in production environment');
            }

            // 개발용 키 생성 (실제 프로덕션에서는 사용하지 않음)
            this.encryptionKey = crypto.randomBytes(this.keyLength);

            logWithContext('warn', 'Generated temporary encryption key for development', {
                keyHex: this.encryptionKey.toString('hex')
            });
        }
    }

    /**
     * 데이터 암호화
     * @param data 암호화할 데이터
     * @returns 암호화된 데이터 (iv + tag + 암호문)
     */
    static encrypt(data: string): string {
        if (!this.encryptionKey) {
            throw new AppError(
                '암호화 키가 초기화되지 않았습니다',
                ErrorType.SYSTEM_ERROR,
                500
            );
        }

        // 초기화 벡터 생성
        const iv = crypto.randomBytes(this.ivLength);

        // 암호화
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        // 암호화 수행
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // 인증 태그 가져오기
        const tag = (cipher as any).getAuthTag();

        // iv + tag + 암호문 형태로 결합
        return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    }

    /**
     * 데이터 복호화
     * @param encryptedData 암호화된 데이터 (iv + tag + 암호문)
     * @returns 복호화된 데이터
     */
    static decrypt(encryptedData: string): string {
        if (!this.encryptionKey) {
            throw new AppError(
                '암호화 키가 초기화되지 않았습니다',
                ErrorType.SYSTEM_ERROR,
                500
            );
        }

        try {
            // iv, tag, 암호문 분리
            const parts = encryptedData.split(':');

            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const tag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];

            // 복호화
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

            // 인증 태그 설정
            (decipher as any).setAuthTag(tag);

            // 복호화 수행
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new AppError(
                '데이터 복호화 실패',
                ErrorType.SYSTEM_ERROR,
                500
            );
        }
    }
}

/**
 * 비밀번호 해싱 및 검증 유틸리티
 */
export class PasswordUtils {
    /**
     * 비밀번호 해싱
     * @param password 원본 비밀번호
     * @returns 해시된 비밀번호
     */
    static async hashPassword(password: string): Promise<string> {
        // Argon2 또는 bcrypt 사용 권장
        // 여기서는 기존 bcrypt 사용 가정
        const bcrypt = require('bcryptjs');
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * 비밀번호 검증
     * @param password 원본 비밀번호
     * @param hash 해시된 비밀번호
     * @returns 일치 여부
     */
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        const bcrypt = require('bcryptjs');
        return bcrypt.compare(password, hash);
    }

    /**
     * 안전한 비밀번호 검증
     * @param password 검증할 비밀번호
     * @returns 안전성 여부 및 메시지
     */
    static validatePasswordStrength(password: string): { isValid: boolean; message: string } {
        // 최소 8자, 대문자, 소문자, 숫자, 특수문자 포함
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!password || password.length < 8) {
            return { isValid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
        }

        if (!strongPasswordRegex.test(password)) {
            return {
                isValid: false,
                message: '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.'
            };
        }

        return { isValid: true, message: '안전한 비밀번호입니다.' };
    }
}

/**
 * CSRF 보호 미들웨어
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    // API 요청에 대한 CSRF 보호
    // 모바일 앱 환경에서는 일반적으로 CSRF 토큰이 필요하지 않으나,
    // 웹 환경에서 API를 사용할 경우를 대비하여 구현

    // GET, HEAD, OPTIONS, TRACE 요청은 안전하므로 CSRF 검사 제외
    const safeHttpMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];

    if (safeHttpMethods.includes(req.method)) {
        return next();
    }

    // 모바일 앱 요청은 Origin 또는 Referer 헤더로 검증
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'https://app.anboim.com',
        process.env.PLANNER_APP_URL || 'https://planner.anboim.com',
        process.env.STUDENT_APP_URL || 'https://student.anboim.com',
        'localhost', // 개발 환경용
    ];

    // 허용된 출처인지 확인
    const isAllowedOrigin = allowedOrigins.some(allowedOrigin =>
        origin.includes(allowedOrigin)
    );

    if (!isAllowedOrigin && process.env.NODE_ENV === 'production') {
        return next(
            new AppError(
                'CSRF 검증 실패: 유효하지 않은 출처',
                ErrorType.AUTHORIZATION_ERROR,
                403
            )
        );
    }

    next();
}