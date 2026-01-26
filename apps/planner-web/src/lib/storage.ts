import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface FileUploadResult {
  url: string;
  path: string;
  error?: string;
}

/**
 * 파일을 Supabase Storage에 업로드합니다
 * @param file - 업로드할 파일
 * @param folder - 저장할 폴더 (예: 'homework-files')
 * @param fileName - 파일명 (선택사항, 없으면 자동 생성)
 */
export async function uploadFileToStorage(
  file: File, 
  folder: string = 'homework-files',
  fileName?: string
): Promise<FileUploadResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('사용자 인증이 필요합니다');
    }

    // 파일명 생성 (중복 방지)
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const finalFileName = fileName || `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${finalFileName}`;

    // 파일 업로드
    const { data, error } = await supabase.storage
      .from(folder)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(folder)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    return {
      url: '',
      path: '',
      error: error.message || '파일 업로드에 실패했습니다'
    };
  }
}

/**
 * 파일을 Supabase Storage에서 삭제합니다
 * @param path - 삭제할 파일 경로
 * @param folder - 파일이 있는 폴더
 */
export async function deleteFileFromStorage(
  path: string,
  folder: string = 'homework-files'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(folder)
      .remove([path]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('File delete error:', error);
    return {
      success: false,
      error: error.message || '파일 삭제에 실패했습니다'
    };
  }
}

/**
 * 파일 다운로드 URL을 생성합니다 (임시 URL)
 * @param path - 파일 경로
 * @param folder - 파일이 있는 폴더
 * @param expiresIn - 만료 시간 (초, 기본: 3600초)
 */
export async function createSignedDownloadUrl(
  path: string, 
  folder: string = 'homework-files',
  expiresIn: number = 3600
): Promise<{ url: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(folder)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return { url: data.signedUrl };
  } catch (error: any) {
    console.error('Signed URL creation error:', error);
    return {
      url: '',
      error: error.message || 'URL 생성에 실패했습니다'
    };
  }
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환합니다
 * @param bytes - 바이트 크기
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 파일 타입이 허용된 타입인지 확인합니다
 * @param file - 확인할 파일
 */
export function isValidFileType(file: File): boolean {
  const validTypes = [
    // 오디오 파일
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac',
    // 비디오 파일
    'video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo',
    // 이미지 파일
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // 문서 파일
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  return validTypes.includes(file.type);
}

/**
 * 파일 크기가 허용 범위 내인지 확인합니다
 * @param file - 확인할 파일
 * @param maxSizeMB - 최대 크기 (MB, 기본: 20MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 20): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * 파일 타입에 따른 아이콘 이름을 반환합니다
 * @param fileType - 파일 MIME 타입
 */
export function getFileIconType(fileType: string): 'audio' | 'video' | 'image' | 'document' | 'file' {
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return 'document';
  return 'file';
}