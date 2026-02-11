import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Nvoim Planner Pro API',
        version: '1.0.0',
        description: '엔보임 플래너 프로 API 문서 - 학생 관리, 수업 스케줄링, AI 숙제 분석',
        contact: {
          name: '엔보임',
          url: 'https://nvoim.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
        {
          url: 'https://nvoim-planer-pro.vercel.app',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase JWT 토큰 인증',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: '에러 메시지',
              },
            },
          },
          License: {
            type: 'object',
            properties: {
              license_key: {
                type: 'string',
                description: '라이선스 키',
              },
              planner_id: {
                type: 'string',
                format: 'uuid',
                description: '플래너 UUID',
              },
              license_type: {
                type: 'string',
                enum: ['trial', 'monthly', 'yearly'],
                description: '라이선스 타입',
              },
              expires_at: {
                type: 'string',
                format: 'date-time',
                description: '만료 일시',
              },
              is_active: {
                type: 'boolean',
                description: '활성화 상태',
              },
            },
          },
          ScheduledHomework: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '숙제 ID',
              },
              student_id: {
                type: 'string',
                format: 'uuid',
                description: '학생 ID',
              },
              lesson_id: {
                type: 'string',
                format: 'uuid',
                description: '수업 ID',
              },
              description: {
                type: 'string',
                description: '숙제 설명',
              },
              due_date: {
                type: 'string',
                format: 'date-time',
                description: '제출 기한',
              },
              status: {
                type: 'string',
                enum: ['pending', 'submitted', 'reviewed', 'cancelled'],
                description: '숙제 상태',
              },
            },
          },
        },
      },
      tags: [
        {
          name: 'Auth',
          description: '인증 관련 API',
        },
        {
          name: 'Licenses',
          description: '라이선스 관리 API',
        },
        {
          name: 'Homework',
          description: '숙제 관리 API',
        },
        {
          name: 'Admin',
          description: '관리자 전용 API',
        },
        {
          name: 'Trial',
          description: '무료 체험 관련 API',
        },
        {
          name: 'Payment',
          description: '결제 관련 API',
        },
        {
          name: 'Courses',
          description: '코스 및 AI 분석 API',
        },
      ],
    },
  });
  return spec;
};
