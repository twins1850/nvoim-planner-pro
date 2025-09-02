import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from './errorHandler';
import mongoose from 'mongoose';

// 유효성 검사 규칙 타입
type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'password';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any, req?: Request) => boolean | string;
  message?: string;
};

// 스키마 타입 정의
type ValidationSchema = {
  body?: Record<string, {
    type?: string;
    required?: boolean;
    items?: Record<string, any>;
    properties?: Record<string, any>;
    enum?: any[];
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any, req?: Request) => boolean | string;
  }>;
  params?: Record<string, any>;
  query?: Record<string, any>;
};

// 이메일 정규식
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 비밀번호 정규식 (최소 8자, 대문자, 소문자, 숫자, 특수문자 포함)
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// 기본 비밀번호 정규식 (최소 6자)
const BASIC_PASSWORD_REGEX = /^.{6,}$/;

// 유효성 검사 미들웨어 생성 함수
export function validate(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = [];
    
    // 각 규칙에 대해 검사
    for (const rule of rules) {
      const { field, required = false } = rule;
      const value = field.includes('.') 
        ? field.split('.').reduce((obj: any, key: string) => obj?.[key], req.body)
        : req.body[field];
      
      // 필수 필드 검사
      if (required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: rule.message || `${field} 필드는 필수입니다.`
        });
        continue;
      }
      
      // 값이 없고 필수가 아니면 다음 규칙으로
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // 타입 검사
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 문자열이어야 합니다.`
              });
            }
            break;
            
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 숫자여야 합니다.`
              });
            }
            break;
            
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 불리언이어야 합니다.`
              });
            }
            break;
            
          case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 객체여야 합니다.`
              });
            }
            break;
            
          case 'array':
            if (!Array.isArray(value)) {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 배열이어야 합니다.`
              });
            }
            break;
            
          case 'email':
            if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 유효한 이메일 주소여야 합니다.`
              });
            }
            break;
            
          case 'password':
            if (typeof value !== 'string' || !BASIC_PASSWORD_REGEX.test(value)) {
              errors.push({
                field,
                message: rule.message || `${field} 필드는 최소 6자 이상이어야 합니다.`
              });
            }
            break;
        }
      }
      
      // 문자열 길이 검사
      if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push({
            field,
            message: rule.message || `${field} 필드는 최소 ${rule.minLength}자 이상이어야 합니다.`
          });
        }
        
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push({
            field,
            message: rule.message || `${field} 필드는 최대 ${rule.maxLength}자까지 허용됩니다.`
          });
        }
      }
      
      // 숫자 범위 검사
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push({
            field,
            message: rule.message || `${field} 필드는 ${rule.min} 이상이어야 합니다.`
          });
        }
        
        if (rule.max !== undefined && value > rule.max) {
          errors.push({
            field,
            message: rule.message || `${field} 필드는 ${rule.max} 이하여야 합니다.`
          });
        }
      }
      
      // 배열 길이 검사
      if (Array.isArray(value)) {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push({
            field,
            message: rule.message || `${field} 배열은 최소 ${rule.minLength}개 이상의 항목이 필요합니다.`
          });
        }
        
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push({
            field,
            message: rule.message || `${field} 배열은 최대 ${rule.maxLength}개까지 항목이 허용됩니다.`
          });
        }
      }
      
      // 정규식 패턴 검사
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: rule.message || `${field} 필드가 유효한 형식이 아닙니다.`
        });
      }
      
      // 열거형 검사
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: rule.message || `${field} 필드는 다음 값 중 하나여야 합니다: ${rule.enum.join(', ')}`
        });
      }
      
      // 사용자 정의 검사
      if (rule.custom) {
        const result = rule.custom(value, req);
        if (result !== true) {
          errors.push({
            field,
            message: typeof result === 'string' ? result : (rule.message || `${field} 필드가 유효하지 않습니다.`)
          });
        }
      }
    }
    
    // 오류가 있으면 에러 응답
    if (errors.length > 0) {
      return next(new AppError('입력 데이터 검증 실패', ErrorType.VALIDATION_ERROR, 400, true, errors));
    }
    
    next();
  };
}

// 새로운 스키마 기반 유효성 검사 미들웨어
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = [];
    
    // 요청 본문 검증
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body?.[field];
        
        // 필수 필드 검사
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({
            field,
            message: `${field} 필드는 필수입니다.`
          });
          continue;
        }
        
        // 값이 없고 필수가 아니면 다음 필드로
        if ((value === undefined || value === null || value === '') && !rules.required) {
          continue;
        }
        
        // 타입 검사
        if (rules.type) {
          switch (rules.type) {
            case 'string':
              if (typeof value !== 'string') {
                errors.push({
                  field,
                  message: `${field} 필드는 문자열이어야 합니다.`
                });
              } else {
                // 문자열 길이 검사
                if (rules.minLength !== undefined && value.length < rules.minLength) {
                  errors.push({
                    field,
                    message: `${field} 필드는 최소 ${rules.minLength}자 이상이어야 합니다.`
                  });
                }
                
                if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                  errors.push({
                    field,
                    message: `${field} 필드는 최대 ${rules.maxLength}자까지 허용됩니다.`
                  });
                }
                
                // 정규식 패턴 검사
                if (rules.pattern && !rules.pattern.test(value)) {
                  errors.push({
                    field,
                    message: `${field} 필드가 유효한 형식이 아닙니다.`
                  });
                }
              }
              break;
              
            case 'number':
              if (typeof value !== 'number' || isNaN(value)) {
                errors.push({
                  field,
                  message: `${field} 필드는 숫자여야 합니다.`
                });
              } else {
                // 숫자 범위 검사
                if (rules.min !== undefined && value < rules.min) {
                  errors.push({
                    field,
                    message: `${field} 필드는 ${rules.min} 이상이어야 합니다.`
                  });
                }
                
                if (rules.max !== undefined && value > rules.max) {
                  errors.push({
                    field,
                    message: `${field} 필드는 ${rules.max} 이하여야 합니다.`
                  });
                }
              }
              break;
              
            case 'boolean':
              if (typeof value !== 'boolean') {
                errors.push({
                  field,
                  message: `${field} 필드는 불리언이어야 합니다.`
                });
              }
              break;
              
            case 'object':
              if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                errors.push({
                  field,
                  message: `${field} 필드는 객체여야 합니다.`
                });
              }
              break;
              
            case 'array':
              if (!Array.isArray(value)) {
                errors.push({
                  field,
                  message: `${field} 필드는 배열이어야 합니다.`
                });
              } else {
                // 배열 길이 검사
                if (rules.minLength !== undefined && value.length < rules.minLength) {
                  errors.push({
                    field,
                    message: `${field} 배열은 최소 ${rules.minLength}개 이상의 항목이 필요합니다.`
                  });
                }
                
                if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                  errors.push({
                    field,
                    message: `${field} 배열은 최대 ${rules.maxLength}개까지 항목이 허용됩니다.`
                  });
                }
                
                // 배열 항목 검사
                if (rules.items && value.length > 0) {
                  for (let i = 0; i < value.length; i++) {
                    const item = value[i];
                    const itemType = rules.items.type;
                    
                    if (itemType && typeof item !== itemType) {
                      errors.push({
                        field: `${field}[${i}]`,
                        message: `${field} 배열의 항목은 ${itemType} 타입이어야 합니다.`
                      });
                    }
                  }
                }
              }
              break;
          }
        }
        
        // 열거형 검사
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: `${field} 필드는 다음 값 중 하나여야 합니다: ${rules.enum.join(', ')}`
          });
        }
        
        // 사용자 정의 검사
        if (rules.custom) {
          const result = rules.custom(value, req);
          if (result !== true) {
            errors.push({
              field,
              message: typeof result === 'string' ? result : `${field} 필드가 유효하지 않습니다.`
            });
          }
        }
      }
    }
    
    // 요청 파라미터 검증 (필요한 경우 구현)
    if (schema.params) {
      // 파라미터 검증 로직 구현
    }
    
    // 쿼리 파라미터 검증 (필요한 경우 구현)
    if (schema.query) {
      // 쿼리 파라미터 검증 로직 구현
    }
    
    // 오류가 있으면 에러 응답
    if (errors.length > 0) {
      return next(new AppError('입력 데이터 검증 실패', ErrorType.VALIDATION_ERROR, 400, true, errors));
    }
    
    next();
  };
}

/**
 * Validate MongoDB ObjectId
 * @param id ID to validate
 * @throws ValidationError if ID is invalid
 */
export function validateObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('유효하지 않은 ID 형식입니다', ErrorType.VALIDATION_ERROR, 400, true);
  }
}

// 자주 사용하는 유효성 검사 규칙
export const validationRules = {
  // 인증 관련 규칙
  auth: {
    login: [
      { field: 'email', required: true, type: 'email' },
      { field: 'password', required: true, type: 'string', minLength: 6 }
    ],
    register: [
      { field: 'email', required: true, type: 'email' },
      { field: 'password', required: true, type: 'password' },
      { field: 'role', required: true, enum: ['planner', 'student'] },
      { field: 'profile.name', required: true, type: 'string', minLength: 2, maxLength: 50 },
      { field: 'profile.phone', type: 'string', pattern: /^[0-9-+().\s]+$/ }
    ],
    changePassword: [
      { field: 'currentPassword', required: true, type: 'string', minLength: 6 },
      { field: 'newPassword', required: true, type: 'password' },
      { field: 'confirmPassword', required: true, type: 'string', custom: (value, req) => value === req?.body?.newPassword || '비밀번호가 일치하지 않습니다.' }
    ]
  },
  
  // 사용자 관련 규칙
  user: {
    updateProfile: [
      { field: 'profile.name', type: 'string', minLength: 2, maxLength: 50 },
      { field: 'profile.phone', type: 'string', pattern: /^[0-9-+().\s]+$/ },
      { field: 'profile.preferences.language', enum: ['ko', 'en'] },
      { field: 'profile.preferences.notifications', type: 'boolean' },
      { field: 'profile.preferences.timezone', type: 'string' }
    ],
    updateLearningLevel: [
      { field: 'learningLevel', required: true, enum: ['beginner', 'intermediate', 'advanced'] }
    ]
  },
  
  // 수업 관련 규칙
  lesson: {
    create: [
      { field: 'studentId', required: true, type: 'string' },
      { field: 'lessonDate', required: true, custom: (value) => !isNaN(Date.parse(value as string)) || '유효한 날짜 형식이 아닙니다.' },
      { field: 'duration', required: true, type: 'number', min: 0 }
    ],
    update: [
      { field: 'lessonDate', custom: (value) => value ? !isNaN(Date.parse(value as string)) : true || '유효한 날짜 형식이 아닙니다.' },
      { field: 'duration', type: 'number', min: 0 }
    ]
  },
  
  // 숙제 관련 규칙
  homework: {
    create: [
      { field: 'title', required: true, type: 'string', minLength: 3, maxLength: 100 },
      { field: 'description', required: true, type: 'string', maxLength: 500 },
      { field: 'studentIds', required: true, type: 'array', minLength: 1 },
      { field: 'type', required: true, enum: ['audio', 'text', 'mixed'] },
      { field: 'dueDate', required: true, custom: (value) => !isNaN(Date.parse(value as string)) || '유효한 날짜 형식이 아닙니다.' }
    ],
    submit: [
      { field: 'answers', required: true, type: 'array', minLength: 1 }
    ]
  },
  
  // 피드백 관련 규칙
  feedback: {
    addPlannerFeedback: [
      { field: 'overallScore', required: true, type: 'number', min: 0, max: 5 },
      { field: 'comments', required: true, type: 'string', maxLength: 1000 },
      { field: 'assessmentCriteria', required: true, type: 'array', minLength: 1 }
    ],
    assessmentCriteria: [
      { field: 'criteriaId', required: true, type: 'string' },
      { field: 'name', required: true, type: 'string' },
      { field: 'score', required: true, type: 'number', min: 0, max: 5 },
      { field: 'maxScore', required: true, type: 'number', min: 1, max: 10 },
      { field: 'comments', type: 'string', maxLength: 500 }
    ]
  },
  
  // 음성 분석 관련 규칙
  speech: {
    analyze: [
      { field: 'separateSpeakers', type: 'boolean' },
      { field: 'evaluatePronunciation', type: 'boolean' },
      { field: 'referenceText', type: 'string' },
      { field: 'identifySpeaker', type: 'boolean' },
      { field: 'speakerIds', type: 'array' }
    ],
    pronunciation: [
      { field: 'referenceText', required: true, type: 'string', minLength: 1 }
    ],
    identify: [
      { field: 'speakerIds', required: true, type: 'array', minLength: 1 }
    ]
  }
};