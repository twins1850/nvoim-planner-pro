import express from 'express';
import { PerformanceController } from '../controllers/performanceController';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = express.Router();

/**
 * 성능 모니터링 라우트
 * 관리자 권한이 있는 사용자만 접근 가능
 */

// 헬스 체크 (인증 불필요)
router.get('/health', PerformanceController.healthCheck);

// 인증 필요한 모든 성능 관련 API
router.use(authenticateToken);
router.use(checkRole(['admin', 'planner'])); // 관리자와 플래너만 접근 가능

/**
 * @route   GET /api/performance/metrics/current
 * @desc    현재 실시간 성능 지표 조회
 * @access  Private (Admin, Planner)
 */
router.get('/metrics/current', PerformanceController.getCurrentMetrics);

/**
 * @route   GET /api/performance/metrics/history
 * @desc    성능 히스토리 조회
 * @query   period: hourly | daily | weekly (기본값: hourly)
 * @access  Private (Admin, Planner)
 */
router.get('/metrics/history', PerformanceController.getMetricsHistory);

/**
 * @route   GET /api/performance/alerts
 * @desc    최근 알림 조회
 * @query   hours: 조회할 시간 범위 (기본값: 24, 최대: 168)
 * @access  Private (Admin, Planner)
 */
router.get('/alerts', PerformanceController.getRecentAlerts);

/**
 * @route   GET /api/performance/dashboard
 * @desc    성능 대시보드 종합 데이터 조회
 * @access  Private (Admin, Planner)
 */
router.get('/dashboard', PerformanceController.getDashboardData);

/**
 * @route   GET /api/performance/response-time
 * @desc    API 응답 시간 통계 조회
 * @access  Private (Admin, Planner)
 */
router.get('/response-time', PerformanceController.getResponseTimeStats);

/**
 * @route   GET /api/performance/cache
 * @desc    캐시 성능 통계 조회
 * @access  Private (Admin, Planner)
 */
router.get('/cache', PerformanceController.getCacheStats);

/**
 * @route   GET /api/performance/memory
 * @desc    메모리 사용 통계 조회
 * @access  Private (Admin, Planner)
 */
router.get('/memory', PerformanceController.getMemoryStats);

/**
 * @route   GET /api/performance/report
 * @desc    종합 성능 보고서 조회
 * @access  Private (Admin, Planner)
 */
router.get('/report', PerformanceController.getPerformanceReport);

/**
 * @route   GET /api/performance/status
 * @desc    성능 모니터링 시스템 상태 조회
 * @access  Private (Admin, Planner)
 */
router.get('/status', PerformanceController.getMonitoringStatus);

// 관리자 전용 설정 변경 API
router.use(checkRole(['admin'])); // 관리자만 접근 가능

/**
 * @route   PUT /api/performance/thresholds
 * @desc    성능 임계값 설정
 * @body    thresholds: 임계값 객체
 * @access  Private (Admin only)
 */
router.put('/thresholds', PerformanceController.setThresholds);

/**
 * @route   PUT /api/performance/alerts/config
 * @desc    알림 설정 업데이트
 * @body    alerts: 알림 설정 배열
 * @access  Private (Admin only)
 */
router.put('/alerts/config', PerformanceController.updateAlertConfig);

/**
 * @route   POST /api/performance/optimize
 * @desc    성능 최적화 실행
 * @body    type: 'all' | 'cache' | 'memory' | 'cleanup'
 * @access  Private (Admin only)
 */
router.post('/optimize', PerformanceController.optimizePerformance);

export default router;