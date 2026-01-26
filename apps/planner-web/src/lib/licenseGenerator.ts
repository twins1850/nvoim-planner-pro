/**
 * 라이선스 키 생성 유틸리티 (서버 전용)
 *
 * 이 파일은 Node.js crypto 모듈을 사용하므로 서버 사이드에서만 사용 가능합니다.
 */

import crypto from 'crypto'

/**
 * 새로운 라이선스 키를 생성합니다.
 *
 * 라이선스 키 형식: {duration}D-{max_students}P-{encryption_key}
 *
 * @param durationDays - 라이선스 유효 기간 (일)
 * @param maxStudents - 최대 학생 수
 * @returns 생성된 라이선스 키 문자열
 *
 * @example
 * const licenseKey = generateLicenseKey(30, 15)
 * // "30D-15P-A1B2C3D4E5F6G7H8"
 */
export function generateLicenseKey(
  durationDays: number,
  maxStudents: number
): string {
  // 암호화 키 생성 (16자리 랜덤 16진수)
  // 8바이트 = 16자리 16진수
  const encryptionKey = crypto.randomBytes(8).toString('hex').toUpperCase()

  // 라이선스 키 형식: {duration}D-{max_students}P-{encryption_key}
  return `${durationDays}D-${maxStudents}P-${encryptionKey}`
}

/**
 * 여러 개의 라이선스 키를 일괄 생성합니다.
 *
 * @param durationDays - 라이선스 유효 기간 (일)
 * @param maxStudents - 최대 학생 수
 * @param count - 생성할 라이선스 키 개수
 * @returns 생성된 라이선스 키 배열
 */
export function generateBulkLicenseKeys(
  durationDays: number,
  maxStudents: number,
  count: number
): string[] {
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    keys.push(generateLicenseKey(durationDays, maxStudents))
  }
  return keys
}

/**
 * 라이선스 키의 암호화 키 부분이 유효한지 검증합니다.
 *
 * @param encryptionKey - 검증할 암호화 키
 * @returns 유효 여부 (16자리 16진수 문자열인지)
 */
export function validateEncryptionKey(encryptionKey: string): boolean {
  return /^[A-F0-9]{16}$/.test(encryptionKey)
}
