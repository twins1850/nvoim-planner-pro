"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Calendar, Clock, Users, FileText, Send, AlertCircle, Upload, Paperclip, File, Music, Video, Image } from "lucide-react";
import { uploadFileToStorage, formatFileSize, isValidFileType, isValidFileSize, getFileIconType } from "@/lib/storage";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface AttachmentFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  uploading?: boolean;
  uploadProgress?: number;
  url?: string;
}

interface CreateHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateHomeworkModal({ isOpen, onClose, onSuccess }: CreateHomeworkModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('👤 플래너 사용자 ID:', user.id);

      // profiles 테이블에서 학생 역할의 사용자들을 가져옴 (실제 인증된 사용자들)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'student');

      if (error) throw error;
      
      console.log('🎓 Raw student profiles data:', data); // 디버깅용
      
      // Student 인터페이스에 맞게 데이터 변환
      const studentsData = (data || []).map(student => ({
        id: student.id, // 실제 인증된 사용자 ID 사용
        name: student.full_name || student.email || `학생 ${student.id}`,
        email: student.email || ''
      })).filter(student => student.id); // id가 있는 경우만 포함
      
      console.log('📋 Processed student data for homework assignment:', studentsData); // 디버깅용
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
    setSelectAll(!selectAll);
  };

  const handleStudentToggle = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedStudents, studentId];
      setSelectedStudents(newSelected);
      if (newSelected.length === students.length) {
        setSelectAll(true);
      }
    }
  };

  // 파일 타입에 따른 아이콘 반환
  const getFileIcon = (type: string) => {
    const iconType = getFileIconType(type);
    switch (iconType) {
      case 'audio': return Music;
      case 'video': return Video;
      case 'image': return Image;
      default: return File;
    }
  };

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 파일 검증
      if (!isValidFileType(file)) {
        setError(`지원되지 않는 파일 형식입니다: ${file.name}`);
        continue;
      }
      
      if (!isValidFileSize(file)) {
        setError(`파일 크기가 너무 큽니다 (최대 20MB): ${file.name}`);
        continue;
      }

      // 중복 파일 확인
      if (attachments.some(att => att.name === file.name && att.size === file.size)) {
        setError(`이미 추가된 파일입니다: ${file.name}`);
        continue;
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploading: false,
        uploadProgress: 0,
      });
    }

    setAttachments(prev => [...prev, ...newFiles]);
    // 입력 필드 초기화
    event.target.value = '';
  };

  // 파일 삭제
  const handleRemoveFile = (fileId: string) => {
    setAttachments(prev => prev.filter(file => file.id !== fileId));
  };

  // 드래그앤드롭 이벤트 핸들러들
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 파일 검증
      if (!isValidFileType(file)) {
        setError(`지원되지 않는 파일 형식입니다: ${file.name}`);
        continue;
      }
      
      if (!isValidFileSize(file)) {
        setError(`파일 크기가 너무 큽니다 (최대 20MB): ${file.name}`);
        continue;
      }

      // 중복 파일 확인
      if (attachments.some(att => att.name === file.name && att.size === file.size)) {
        setError(`이미 추가된 파일입니다: ${file.name}`);
        continue;
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploading: false,
        uploadProgress: 0,
      });
    }

    setAttachments(prev => [...prev, ...newFiles]);
  };

  // 파일 업로드 to Supabase Storage
  const uploadHomeworkFile = async (file: AttachmentFile): Promise<string> => {
    const result = await uploadFileToStorage(file.file, 'homework-files');
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    console.log("📝 숙제 생성 시작...", {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      selectedStudents,
      attachmentsCount: attachments.length
    });

    if (!title.trim() || !description.trim() || !dueDate || selectedStudents.length === 0) {
      setError("모든 필드를 입력하고 최소 한 명의 학생을 선택해주세요.");
      return;
    }

    setLoading(true);
    setUploadingFiles(true);

    try {
      console.log("🔐 Supabase 클라이언트 생성...");
      const supabase = createClient();
      console.log("👤 사용자 정보 확인...");
      const { data: { user } } = await supabase.auth.getUser();
      console.log("사용자:", user?.id, user?.email);
      if (!user) throw new Error("사용자 인증 실패");

      // 첨부파일이 있으면 먼저 업로드
      let attachmentUrls: any[] = [];
      if (attachments.length > 0) {
        for (let i = 0; i < attachments.length; i++) {
          const attachment = attachments[i];
          try {
            // 업로드 진행 상태 표시
            setAttachments(prev => prev.map(file => 
              file.id === attachment.id 
                ? { ...file, uploading: true, uploadProgress: 50 }
                : file
            ));

            const url = await uploadHomeworkFile(attachment);
            
            // 업로드 완료 표시
            setAttachments(prev => prev.map(file => 
              file.id === attachment.id 
                ? { ...file, uploading: false, uploadProgress: 100, url }
                : file
            ));

            attachmentUrls.push({
              name: attachment.name,
              url,
              type: attachment.type,
              size: attachment.size
            });
          } catch (uploadError) {
            console.error(`파일 업로드 실패: ${attachment.name}`, uploadError);
            throw new Error(`파일 업로드 실패: ${attachment.name}`);
          }
        }
      }

      // 숙제 생성 (첨부파일 정보 포함)
      console.log("📚 homework 테이블에 데이터 삽입 중...");
      const homeworkData = {
        planner_id: user.id,
        title,
        description,
        instructions: description, // instructions 필드 추가
        due_date: dueDate,
        resources: attachmentUrls.length > 0 ? { attachments: attachmentUrls } : null
      };
      console.log("삽입할 데이터:", homeworkData);
      
      const { data: homework, error: homeworkError } = await supabase
        .from('homework')
        .insert(homeworkData)
        .select()
        .single();

      console.log("homework 삽입 결과:", { homework, homeworkError });
      if (homeworkError) throw homeworkError;

      // 선택된 학생들에게 숙제 할당
      console.log("👥 학생들에게 숙제 할당 중...", selectedStudents);
      const assignments = selectedStudents.map(studentId => ({
        homework_id: homework.id,
        student_id: studentId,
        status: 'pending'
      }));
      console.log("할당할 데이터:", assignments);

      const { error: assignError } = await supabase
        .from('homework_assignments')
        .insert(assignments);

      console.log("homework_assignments 할당 결과:", { assignError });
      if (assignError) throw assignError;

      // 실시간 알림 전송 (임시 비활성화 - RLS 정책 문제로 인해)
      if (false && sendNotification) {
        const notifications = selectedStudents.map(studentId => ({
          user_id: studentId,
          type: 'homework_assigned',
          title: '새로운 숙제가 배정되었습니다',
          message: `"${title}" 숙제가 배정되었습니다. 마감일: ${new Date(dueDate).toLocaleDateString('ko-KR')}`,
          data: {
            homework_id: homework.id,
            teacher_id: user!.id,
            due_date: dueDate
          },
          is_read: false
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('알림 전송 실패:', notifError);
        }
      }

      // 성공
      console.log("✅ 숙제 생성 완료! homework.id:", homework.id);
      onSuccess();
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('숙제 생성 실패:', error);
      setError(error.message || '숙제 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setSelectedStudents([]);
    setSelectAll(false);
    setSendNotification(true);
    setAttachments([]);
    setUploadingFiles(false);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">새 숙제 생성</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              숙제 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Unit 5 Speaking Practice"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 및 지시사항
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="학생들이 수행해야 할 과제 내용을 자세히 입력하세요..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 마감일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              마감일
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Paperclip className="w-4 h-4 inline mr-2" />
              첨부파일 <span className="text-gray-500">(선택사항)</span>
            </label>
            <div className="space-y-3">
              {/* 파일 업로드 버튼 */}
              <div className="flex items-center justify-center w-full">
                <label 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">클릭하여 파일 선택</span> 또는 드래그앤드롭
                    </p>
                    <p className="text-xs text-gray-500">
                      MP3, 동영상, 사진, 문서 (최대 20MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="audio/*,video/*,image/*,application/pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    disabled={uploadingFiles}
                  />
                </label>
              </div>

              {/* 선택된 파일 목록 */}
              {attachments.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700">
                    선택된 파일 ({attachments.length}개)
                  </p>
                  {attachments.map(attachment => {
                    const FileIcon = getFileIcon(attachment.type);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <FileIcon className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                              {attachment.uploading && (
                                <span className="ml-2 text-blue-600">
                                  업로드 중... {attachment.uploadProgress}%
                                </span>
                              )}
                              {attachment.url && (
                                <span className="ml-2 text-green-600">✓ 업로드 완료</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {!attachment.uploading && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(attachment.id)}
                            className="ml-3 text-red-600 hover:text-red-700"
                            disabled={uploadingFiles}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {attachment.uploading && (
                          <div className="ml-3 w-4 h-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* 총 파일 크기 표시 */}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      총 파일 크기: {formatFileSize(attachments.reduce((sum, file) => sum + file.size, 0))}
                      {attachments.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024 && (
                        <span className="text-red-600 ml-2">
                          ⚠ 50MB를 초과했습니다
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 학생 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              배정할 학생 선택 ({selectedStudents.length}/{students.length}명 선택됨)
            </label>
            
            <div className="border border-gray-300 rounded-lg p-4">
              {/* 전체 선택 */}
              <div className="flex items-center mb-3 pb-3 border-b border-gray-200">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-700">
                  전체 선택
                </label>
              </div>

              {/* 학생 목록 */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {students.length === 0 ? (
                  <p className="text-gray-500 text-sm">등록된 학생이 없습니다.</p>
                ) : (
                  students.map(student => (
                    <div key={student.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentToggle(student.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`student-${student.id}`}
                        className="ml-2 flex-1 text-sm text-gray-700 cursor-pointer"
                      >
                        <span className="font-medium">{student.name}</span>
                        <span className="text-gray-500 ml-2">({student.email})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="send-notification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="send-notification" className="ml-2 text-sm text-gray-700">
              학생들에게 실시간 알림 전송
            </label>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              disabled={loading || uploadingFiles || selectedStudents.length === 0}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadingFiles ? '파일 업로드 중...' : '숙제 생성 중...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {attachments.length > 0 ? `숙제 생성 (${attachments.length}개 첨부파일 포함)` : '숙제 생성 및 배정'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}