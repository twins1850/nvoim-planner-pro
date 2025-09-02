import path from 'path';

/**
 * 파일명에서 학생 이름과 수업 날짜 추출
 * 
 * 지원하는 형식:
 * - 홍길동_20240715.mp4
 * - 홍길동-20240715.mp4
 * - 홍길동 20240715.mp4
 * - 홍길동(20240715).mp4
 * - 홍길동 2024-07-15.mp4
 * - 홍길동 2024.07.15.mp4
 */
export function extractMetadataFromFilename(filename: string): {
  studentName: string | null;
  lessonDate: Date | null;
  extractedFromFilename: boolean;
} {
  // 파일 확장자 제거
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  
  // 다양한 형식의 정규식 패턴
  const patterns = [
    // 홍길동_20240715 형식
    /^(.+?)_(\d{8})$/,
    // 홍길동-20240715 형식
    /^(.+?)-(\d{8})$/,
    // 홍길동 20240715 형식
    /^(.+?)\s+(\d{8})$/,
    // 홍길동(20240715) 형식
    /^(.+?)\((\d{8})\)$/,
    // 홍길동 2024-07-15 형식
    /^(.+?)\s+(\d{4}-\d{2}-\d{2})$/,
    // 홍길동 2024.07.15 형식
    /^(.+?)\s+(\d{4}[.]\d{2}[.]\d{2})$/,
  ];
  
  // 각 패턴 시도
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      const studentName = match[1].trim();
      let dateStr = match[2];
      let lessonDate: Date | null = null;
      
      // 날짜 형식 변환
      try {
        if (dateStr.length === 8) {
          // YYYYMMDD 형식
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // 월은 0부터 시작
          const day = parseInt(dateStr.substring(6, 8));
          lessonDate = new Date(year, month, day);
        } else if (dateStr.includes('-')) {
          // YYYY-MM-DD 형식
          lessonDate = new Date(dateStr);
        } else if (dateStr.includes('.')) {
          // YYYY.MM.DD 형식
          dateStr = dateStr.replace(/\./g, '-');
          lessonDate = new Date(dateStr);
        }
        
        // 유효한 날짜인지 확인
        if (lessonDate && isNaN(lessonDate.getTime())) {
          lessonDate = null;
        }
      } catch (error) {
        lessonDate = null;
      }
      
      return {
        studentName,
        lessonDate,
        extractedFromFilename: true,
      };
    }
  }
  
  // 추출 실패
  return {
    studentName: null,
    lessonDate: null,
    extractedFromFilename: false,
  };
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 안전한 파일명 생성 (특수문자 제거)
 */
export function sanitizeFilename(filename: string): string {
  // 확장자 분리
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  
  // 특수문자 제거 및 공백을 언더스코어로 변경
  const sanitized = name
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_');
  
  return sanitized + ext;
}

/**
 * 고유한 파일명 생성
 */
export function generateUniqueFilename(originalname: string): string {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  
  return `${timestamp}_${randomString}${ext}`;
}

/**
 * 파일 확장자로 MIME 타입 추측
 */
export function getMimeTypeFromExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/m4a',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };
  
  return mimeTypes[ext] || null;
}

/**
 * MIME 타입으로 파일 타입 결정
 */
export function getFileTypeFromMimeType(mimeType: string): 'video' | 'audio' | 'image' | null {
  if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (mimeType.startsWith('image/')) {
    return 'image';
  }
  
  return null;
}