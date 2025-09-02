/**
 * Artillery 성능 테스트 프로세서
 * 성능 모니터링 시스템 테스트를 위한 커스텀 로직
 */

const fs = require('fs');
const path = require('path');

// 테스트 결과 수집
let testResults = {
  startTime: Date.now(),
  metrics: [],
  errors: [],
  responseTimeStats: {
    min: Infinity,
    max: 0,
    total: 0,
    count: 0
  }
};

/**
 * 테스트 시작 시 호출
 */
function beforeScenario(requestParams, context, ee, next) {
  // 테스트 사용자 정보 설정
  if (!context.vars.testUser) {
    const users = [
      { email: 'admin@test.com', password: 'TestPassword123!', role: 'admin' },
      { email: 'planner@test.com', password: 'TestPassword123!', role: 'planner' }
    ];
    
    const randomUser = users[Math.floor(Math.random() * users.length)];
    context.vars.testUser = randomUser;
  }

  // 요청 시작 시간 기록
  context.vars.requestStartTime = Date.now();
  
  return next();
}

/**
 * 응답 후 호출
 */
function afterResponse(requestParams, response, context, ee, next) {
  const responseTime = Date.now() - context.vars.requestStartTime;
  
  // 응답 시간 통계 업데이트
  testResults.responseTimeStats.count++;
  testResults.responseTimeStats.total += responseTime;
  testResults.responseTimeStats.min = Math.min(testResults.responseTimeStats.min, responseTime);
  testResults.responseTimeStats.max = Math.max(testResults.responseTimeStats.max, responseTime);

  // 성능 지표 수집
  if (response.statusCode === 200 && response.body) {
    try {
      const body = JSON.parse(response.body);
      
      // 성능 메트릭이 포함된 응답인 경우
      if (body.data && body.data.memoryUsage) {
        testResults.metrics.push({
          timestamp: new Date(),
          url: requestParams.url,
          responseTime,
          memoryUsage: body.data.memoryUsage,
          cpuUsage: body.data.cpuUsage
        });
      }
    } catch (error) {
      // JSON 파싱 에러는 무시
    }
  }

  // 에러 응답 기록
  if (response.statusCode >= 400) {
    testResults.errors.push({
      timestamp: new Date(),
      url: requestParams.url,
      statusCode: response.statusCode,
      responseTime,
      error: response.body ? response.body.substring(0, 500) : 'No error message'
    });
  }

  // 느린 응답 경고
  if (responseTime > 2000) {
    console.warn(`⚠️  Slow response detected: ${requestParams.url} took ${responseTime}ms`);
  }

  return next();
}

/**
 * 사용자 정의 함수: 로그인 정보 설정
 */
function setLoginCredentials(requestParams, context, ee, next) {
  const user = context.vars.testUser;
  if (user) {
    requestParams.json = {
      email: user.email,
      password: user.password
    };
  }
  return next();
}

/**
 * 사용자 정의 함수: 인증 토큰 검증
 */
function validateAuthToken(requestParams, response, context, ee, next) {
  if (response.statusCode === 200) {
    try {
      const body = JSON.parse(response.body);
      if (body.token) {
        console.log(`✅ Authentication successful for ${context.vars.testUser?.email}`);
        context.vars.authToken = body.token;
      }
    } catch (error) {
      console.error('❌ Failed to parse authentication response:', error.message);
    }
  } else {
    console.error(`❌ Authentication failed: ${response.statusCode}`);
  }
  return next();
}

/**
 * 사용자 정의 함수: 성능 메트릭 검증
 */
function validatePerformanceMetrics(requestParams, response, context, ee, next) {
  if (response.statusCode === 200) {
    try {
      const body = JSON.parse(response.body);
      
      // 메트릭 데이터 구조 검증
      if (body.data) {
        const requiredFields = ['timestamp', 'memoryUsage', 'cpuUsage'];
        const missingFields = requiredFields.filter(field => !body.data[field]);
        
        if (missingFields.length === 0) {
          console.log(`✅ Performance metrics validated for ${requestParams.url}`);
        } else {
          console.warn(`⚠️  Missing metric fields: ${missingFields.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to validate performance metrics:', error.message);
    }
  }
  return next();
}

/**
 * 테스트 완료 시 결과 저장
 */
function saveTestResults() {
  const endTime = Date.now();
  const duration = endTime - testResults.startTime;
  
  const summary = {
    testDuration: `${Math.round(duration / 1000)}s`,
    totalRequests: testResults.responseTimeStats.count,
    averageResponseTime: testResults.responseTimeStats.count > 0 
      ? Math.round(testResults.responseTimeStats.total / testResults.responseTimeStats.count) 
      : 0,
    minResponseTime: testResults.responseTimeStats.min === Infinity ? 0 : testResults.responseTimeStats.min,
    maxResponseTime: testResults.responseTimeStats.max,
    errorRate: testResults.responseTimeStats.count > 0 
      ? Math.round((testResults.errors.length / testResults.responseTimeStats.count) * 100) 
      : 0,
    errorCount: testResults.errors.length,
    metricsCollected: testResults.metrics.length
  };

  // 결과 파일 저장
  const resultsPath = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsPath)) {
    fs.mkdirSync(resultsPath, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryFile = path.join(resultsPath, `performance-test-summary-${timestamp}.json`);
  const detailFile = path.join(resultsPath, `performance-test-details-${timestamp}.json`);

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  fs.writeFileSync(detailFile, JSON.stringify(testResults, null, 2));

  console.log('\n📊 Performance Test Summary:');
  console.log('================================');
  console.log(`Test Duration: ${summary.testDuration}`);
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(`Average Response Time: ${summary.averageResponseTime}ms`);
  console.log(`Min Response Time: ${summary.minResponseTime}ms`);
  console.log(`Max Response Time: ${summary.maxResponseTime}ms`);
  console.log(`Error Rate: ${summary.errorRate}%`);
  console.log(`Error Count: ${summary.errorCount}`);
  console.log(`Metrics Collected: ${summary.metricsCollected}`);
  console.log('================================');
  console.log(`📁 Detailed results saved to: ${detailFile}`);
  console.log(`📁 Summary saved to: ${summaryFile}\n`);

  // 성능 임계값 검사
  const warnings = [];
  if (summary.averageResponseTime > 1000) {
    warnings.push(`⚠️  Average response time (${summary.averageResponseTime}ms) exceeds 1000ms threshold`);
  }
  if (summary.errorRate > 5) {
    warnings.push(`⚠️  Error rate (${summary.errorRate}%) exceeds 5% threshold`);
  }
  if (summary.maxResponseTime > 5000) {
    warnings.push(`⚠️  Max response time (${summary.maxResponseTime}ms) exceeds 5000ms threshold`);
  }

  if (warnings.length > 0) {
    console.log('🚨 Performance Warnings:');
    warnings.forEach(warning => console.log(warning));
    console.log();
  } else {
    console.log('✅ All performance thresholds met!\n');
  }
}

// 프로세스 종료 시 결과 저장
process.on('SIGINT', saveTestResults);
process.on('SIGTERM', saveTestResults);
process.on('exit', saveTestResults);

// Artillery 이벤트 리스너
module.exports = {
  beforeScenario,
  afterResponse,
  setLoginCredentials,
  validateAuthToken,
  validatePerformanceMetrics
};