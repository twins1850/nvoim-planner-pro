/**
 * 라이선스 키 파싱 및 검증 유틸리티
 *
 * 라이선스 키 형식: {duration}D-{max_students}P-{encryption_key}
 * 예시: 30D-15P-ABC123DEF456
 */

export interface ParsedLicenseKey {
  durationDays: number
  maxStudents: number
  encryptionKey: string
}

/**
 * 라이선스 키를 파싱하여 구성 요소를 추출합니다.
 *
 * @param licenseKey - 파싱할 라이선스 키 문자열
 * @returns 파싱된 라이선스 정보 또는 null (형식이 잘못된 경우)
 *
 * @example
 * const parsed = parseLicenseKey('30D-15P-ABC123DEF456')
 * // { durationDays: 30, maxStudents: 15, encryptionKey: 'ABC123DEF456' }
 */
export function parseLicenseKey(licenseKey: string): ParsedLicenseKey | null {
  // 라이선스 키 형식: {숫자}D-{숫자}P-{16진수}
  const regex = /^(\d+)D-(\d+)P-([A-F0-9]+)$/
  const match = licenseKey.trim().toUpperCase().match(regex)

  if (!match) {
    return null
  }

  return {
    durationDays: parseInt(match[1], 10),
    maxStudents: parseInt(match[2], 10),
    encryptionKey: match[3]
  }
}

/**
 * 라이선스 키 형식이 유효한지 검증합니다.
 *
 * @param licenseKey - 검증할 라이선스 키 문자열
 * @returns 유효 여부
 */
export function validateLicenseKeyFormat(licenseKey: string): boolean {
  return parseLicenseKey(licenseKey) !== null
}

/**
 * 라이선스 키를 정규화합니다 (대문자 변환, 공백 제거).
 *
 * @param licenseKey - 정규화할 라이선스 키 문자열
 * @returns 정규화된 라이선스 키
 */
export function normalizeLicenseKey(licenseKey: string): string {
  return licenseKey.trim().toUpperCase()
}
