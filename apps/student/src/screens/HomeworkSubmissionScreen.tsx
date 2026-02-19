import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// 컴포넌트
import AudioRecorder from '../components/AudioRecorder';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { homeworkAPI } from '../services/supabaseApi';
import { supabase } from '../lib/supabase';

type HomeworkSubmissionScreenRouteProp = RouteProp<RootStackParamList, 'HomeworkSubmission'>;
type HomeworkSubmissionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeworkSubmissionScreen = () => {
  const navigation = useNavigation<HomeworkSubmissionScreenNavigationProp>();
  const route = useRoute<HomeworkSubmissionScreenRouteProp>();
  const { homeworkId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homework, setHomework] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 제출 데이터
  const [submissionText, setSubmissionText] = useState('');
  const [audioFile, setAudioFile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionType, setSubmissionType] = useState<'text' | 'audio' | 'file'>('text');

  // Web용 파일 input ref (값 초기화용)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadHomeworkDetail();
  }, [homeworkId]);

  const loadHomeworkDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await homeworkAPI.getHomeworkDetail(homeworkId);
      if (response.success) {
        const homeworkData = response.data.homework;
        setHomework(homeworkData);
      } else {
        setError('숙제 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load homework detail:', error);
      setError('숙제 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAudioRecorded = (audioFileData: any) => {
    setAudioFile(audioFileData);
    setSubmissionType('audio');
  };

  // Web용 파일 input change 핸들러
  const handleFileInputChange = async (e: any) => {
    const file = e.target?.files?.[0];

    if (!file) {
      return;
    }

    const fileSize = file.size;
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (fileSize > maxSize) {
      Alert.alert('파일 크기 초과', '파일 크기는 50MB를 초과할 수 없습니다.', [{ text: '확인' }]);
      // input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    console.log('📁 파일 선택됨:', file.name, file.size, file.type);
    setSelectedFile({
      name: file.name,
      size: file.size,
      mimeType: file.type,
      uri: URL.createObjectURL(file),
      file: file // Web에서는 원본 File 객체 저장
    });
    setSubmissionType('file');
    Alert.alert('파일 선택 완료', `${file.name} 파일이 선택되었습니다.`, [{ text: '확인' }]);
  };

  const handleFileSelect = async () => {
    // Native 플랫폼에서만 사용 (Web은 overlay input 사용)
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          // 음성 파일
          'audio/mpeg',
          'audio/mp3',
          'audio/m4a',
          'audio/wav',
          'audio/webm',
          // 비디오 파일
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
          // 텍스트/문서 파일
          'text/plain',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      const fileSize = file.size || 0;
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (fileSize > maxSize) {
        Alert.alert('파일 크기 초과', '파일 크기는 50MB를 초과할 수 없습니다.', [{ text: '확인' }]);
        return;
      }

      setSelectedFile(file);
      setSubmissionType('file');
      Alert.alert('파일 선택 완료', `${file.name} 파일이 선택되었습니다.`, [{ text: '확인' }]);
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('오류', '파일 선택 중 오류가 발생했습니다.', [{ text: '확인' }]);
    }
  };

  const handleSubmit = async () => {
    // 검증
    if (submissionType === 'text' && !submissionText.trim()) {
      Alert.alert('답변 입력 필요', '텍스트 답변을 입력해주세요.', [{ text: '확인' }]);
      return;
    }

    if (submissionType === 'audio' && !audioFile) {
      Alert.alert('녹음 필요', '음성 녹음을 해주세요.', [{ text: '확인' }]);
      return;
    }

    if (submissionType === 'file' && !selectedFile) {
      Alert.alert('파일 선택 필요', '업로드할 파일을 선택해주세요.', [{ text: '확인' }]);
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      const submissionData: any = {
        type: submissionType
      };

      if (submissionType === 'text') {
        submissionData.text = submissionText;
      } else if (submissionType === 'file') {
        // 파일을 Supabase Storage에 업로드
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        setUploadProgress(10);

        let blob: Blob;
        let contentType: string;
        const fileName = selectedFile.name;
        const fileExtension = fileName.split('.').pop() || '';

        // Platform별로 다르게 처리
        if (Platform.OS === 'web') {
          // Web: File 객체를 직접 Blob으로 사용
          blob = selectedFile.file; // HTML input에서 선택한 File 객체
          contentType = selectedFile.mimeType || 'application/octet-stream';

          console.log('🌐 Web 환경: 파일 업로드', {
            fileName,
            blobSize: blob.size,
            blobType: blob.type
          });
        } else {
          // Native: expo-file-system 사용
          const base64File = await FileSystem.readAsStringAsync(selectedFile.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          setUploadProgress(30);

          // Base64를 ArrayBuffer로 변환
          const byteCharacters = atob(base64File);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          contentType = selectedFile.mimeType || 'application/octet-stream';
          blob = new Blob([byteArray], { type: contentType });

          console.log('📱 Native 환경: 파일 업로드', {
            fileName,
            blobSize: blob.size
          });
        }

        setUploadProgress(50);

        // 파일 경로 생성
        const filePath = `${user.id}/${homeworkId}/${fileName}`;

        console.log('📤 파일 업로드 중...', {
          platform: Platform.OS,
          filePath,
          blobSize: blob.size,
          blobType: blob.type
        });

        // Supabase Storage에 업로드
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('homework-submissions')
          .upload(filePath, blob, {
            contentType,
            upsert: false
          });

        if (uploadError) {
          console.error('파일 업로드 실패:', uploadError);
          throw new Error(`파일 업로드에 실패했습니다: ${uploadError.message}`);
        }

        setUploadProgress(90);

        console.log('✅ 파일 업로드 완료:', filePath);

        submissionData.fileUrl = filePath;
        submissionData.fileName = fileName;
        submissionData.fileType = contentType;
      } else if (submissionType === 'audio') {
        // 음성 파일을 Supabase Storage에 업로드
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        let uploadData: Blob | Uint8Array;
        let contentType: string;
        let fileExtension: string;

        // Platform별로 다르게 처리
        if (Platform.OS === 'web') {
          // Web: audioFile.uri의 Blob URL에서 파일 가져오기
          const response = await fetch(audioFile.uri);
          uploadData = await response.blob();
          contentType = 'audio/webm'; // Web에서는 webm 형식
          fileExtension = 'webm';

          console.log('🌐 Web 환경: Blob URL에서 파일 가져오기', {
            uri: audioFile.uri,
            dataSize: uploadData.size,
            dataType: uploadData.type
          });
        } else {
          // Native (iOS/Android): expo-file-system 사용
          const FileSystem = require('expo-file-system');

          // Base64로 파일 읽기
          const base64Audio = await FileSystem.readAsStringAsync(audioFile.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Base64를 Uint8Array로 변환 (React Native는 Blob 미지원)
          const byteCharacters = atob(base64Audio);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          uploadData = new Uint8Array(byteNumbers);

          contentType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';
          fileExtension = Platform.OS === 'ios' ? 'm4a' : 'mp4';

          console.log('📱 Native 환경: expo-file-system으로 파일 읽기', {
            uri: audioFile.uri,
            dataSize: uploadData.length,
            contentType
          });
        }

        // 파일명 생성
        const fileName = `audio_${Date.now()}.${fileExtension}`;
        const filePath = `${user.id}/${homeworkId}/${fileName}`;

        console.log('📤 음성 파일 업로드 중...', {
          platform: Platform.OS,
          filePath,
          contentType
        });

        // Supabase Storage에 업로드
        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('homework-submissions')
          .upload(filePath, uploadData, {
            contentType,
            upsert: false
          });

        if (uploadError) {
          console.error('음성 파일 업로드 실패:', uploadError);
          throw new Error(`음성 파일 업로드에 실패했습니다: ${uploadError.message}`);
        }

        // 파일 경로 저장 (플래너 앱에서 signed URL 생성)
        console.log('✅ 음성 파일 업로드 완료:', filePath);

        submissionData.audioUrl = filePath;
      }

      console.log('📤 제출 데이터:', submissionData);

      const response = await homeworkAPI.submitHomework(homeworkId, submissionData);

      if (response.success) {
        Alert.alert(
          '제출 완료',
          '숙제가 성공적으로 제출되었습니다.',
          [
            {
              text: '확인',
              onPress: () => (navigation as any).navigate('Main', { screen: 'Homework' })
            }
          ]
        );
      } else {
        Alert.alert(
          '제출 실패',
          (response as any).error?.message || '숙제 제출에 실패했습니다.',
          [{ text: '확인' }]
        );
      }
    } catch (error) {
      console.error('Failed to submit homework:', error);
      Alert.alert(
        '오류',
        '숙제 제출 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>숙제 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (error || !homework) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error || '숙제를 찾을 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadHomeworkDetail}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {/* 숙제 정보 */}
          <View style={styles.homeworkInfo}>
            <Text style={styles.homeworkTitle}>{homework.title}</Text>
            {homework.instructions && (
              <Text style={styles.instructions}>{homework.instructions}</Text>
            )}
          </View>

          {/* 제출 타입 선택 */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                submissionType === 'text' && styles.typeButtonActive
              ]}
              onPress={() => setSubmissionType('text')}
            >
              <Ionicons
                name="text-outline"
                size={24}
                color={submissionType === 'text' ? '#FFFFFF' : '#007AFF'}
              />
              <Text style={[
                styles.typeButtonText,
                submissionType === 'text' && styles.typeButtonTextActive
              ]}>
                텍스트
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                submissionType === 'audio' && styles.typeButtonActive
              ]}
              onPress={() => setSubmissionType('audio')}
            >
              <Ionicons
                name="mic-outline"
                size={24}
                color={submissionType === 'audio' ? '#FFFFFF' : '#007AFF'}
              />
              <Text style={[
                styles.typeButtonText,
                submissionType === 'audio' && styles.typeButtonTextActive
              ]}>
                음성 녹음
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'web' ? (
              // Web: Native HTML button
              <button
                onClick={() => {
                  console.log('🖱️ 파일 첨부 버튼 클릭!');
                  fileInputRef.current?.click();
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: submissionType === 'file' ? '#007AFF' : '#FFFFFF',
                  cursor: 'pointer',
                  minWidth: '100px',
                }}
              >
                <Ionicons
                  name="document-attach-outline"
                  size={24}
                  color={submissionType === 'file' ? '#FFFFFF' : '#007AFF'}
                />
                <Text style={[
                  styles.typeButtonText,
                  submissionType === 'file' && styles.typeButtonTextActive
                ]}>
                  파일 첨부
                </Text>
              </button>
            ) : (
              // Native: TouchableOpacity 사용
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  submissionType === 'file' && styles.typeButtonActive
                ]}
                onPress={handleFileSelect}
              >
                <Ionicons
                  name="document-attach-outline"
                  size={24}
                  color={submissionType === 'file' ? '#FFFFFF' : '#007AFF'}
                />
                <Text style={[
                  styles.typeButtonText,
                  submissionType === 'file' && styles.typeButtonTextActive
                ]}>
                  파일 첨부
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 제출 내용 */}
          {submissionType === 'text' ? (
            <View style={styles.textInputContainer}>
              <Text style={styles.label}>답변 작성</Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={10}
                placeholder="답변을 입력하세요..."
                value={submissionText}
                onChangeText={setSubmissionText}
                textAlignVertical="top"
              />
            </View>
          ) : submissionType === 'audio' ? (
            <View style={styles.audioRecorderContainer}>
              <Text style={styles.label}>음성 녹음</Text>
              <AudioRecorder onRecordingComplete={handleAudioRecorded} />
              {audioFile && (
                <View style={styles.audioRecorded}>
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  <Text style={styles.audioRecordedText}>녹음 완료</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.fileUploadContainer}>
              <Text style={styles.label}>파일 첨부</Text>
              {selectedFile ? (
                <View style={styles.selectedFileContainer}>
                  <View style={styles.fileIconContainer}>
                    <Ionicons
                      name={
                        selectedFile.mimeType?.startsWith('audio/') ? 'musical-notes' :
                        selectedFile.mimeType?.startsWith('video/') ? 'videocam' :
                        selectedFile.mimeType?.includes('pdf') ? 'document-text' :
                        'document'
                      }
                      size={32}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                    <Text style={styles.fileSize}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => {
                      setSelectedFile(null);
                      setSubmissionType('text');
                      // Web에서 파일 input 값 초기화 (재선택 가능하게)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectFileButton}
                  onPress={handleFileSelect}
                >
                  <Ionicons name="cloud-upload-outline" size={48} color="#007AFF" />
                  <Text style={styles.selectFileText}>파일 선택하기</Text>
                  <Text style={styles.selectFileHint}>
                    음성, 비디오, 텍스트 파일 (최대 50MB)
                  </Text>
                </TouchableOpacity>
              )}
              {uploading && uploadProgress > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
              )}
            </View>
          )}

          {/* 제출 버튼 */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>제출하기</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Web: 숨겨진 파일 input */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef as any}
            type="file"
            accept="audio/*,video/*,.txt,.pdf,.docx"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  homeworkInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  homeworkTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  textInputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  audioRecorderContainer: {
    marginBottom: 16,
  },
  audioRecorded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  audioRecordedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fileUploadContainer: {
    marginBottom: 16,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#8E8E93',
  },
  removeFileButton: {
    padding: 4,
  },
  selectFileButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  selectFileText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
  },
  selectFileHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default HomeworkSubmissionScreen;
