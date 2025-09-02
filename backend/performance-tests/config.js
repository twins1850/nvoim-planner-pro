module.exports = {
  // 성능 테스트 기준
  performanceTargets: {
    // API 응답 시간
    apiResponseTime: {
      p95: 500, // 95% of requests should be under 500ms
      p99: 1000 // 99% of requests should be under 1000ms
    },
    
    // 파일 처리 시간
    fileProcessing: {
      audioExtraction: 10000, // Audio extraction should take less than 10s
      transcription: 30000, // Transcription should take less than 30s
      analysis: 5000 // Analysis should take less than 5s
    },
    
    // 동시 사용자 처리
    concurrentUsers: {
      standard: 50, // Should handle 50 concurrent users
      peak: 100 // Should handle 100 concurrent users during peak times
    },
    
    // 데이터베이스 쿼리 성능
    databaseQueries: {
      simple: 50, // Simple queries should take less than 50ms
      complex: 200 // Complex queries should take less than 200ms
    }
  },
  
  // 테스트 환경 설정
  environments: {
    development: {
      baseUrl: 'http://localhost:3000',
      users: {
        planner: {
          email: 'test-planner@example.com',
          password: 'password123'
        },
        student: {
          email: 'test-student@example.com',
          password: 'password123'
        }
      }
    },
    staging: {
      baseUrl: 'https://staging-api.example.com',
      users: {
        planner: {
          email: 'staging-planner@example.com',
          password: 'stagingPass123'
        },
        student: {
          email: 'staging-student@example.com',
          password: 'stagingPass123'
        }
      }
    }
  },
  
  // Artillery 설정
  artillery: {
    phases: [
      { duration: 60, arrivalRate: 5, name: 'Warm up' },
      { duration: 120, arrivalRate: 10, rampTo: 30, name: 'Ramp up load' },
      { duration: 300, arrivalRate: 30, name: 'Sustained load' },
      { duration: 60, arrivalRate: 50, name: 'Peak load' },
      { duration: 60, arrivalRate: 10, name: 'Ramp down' }
    ],
    defaults: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  }
};