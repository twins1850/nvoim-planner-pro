import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { homeworkAPI } from '../services/supabaseApi';
import { supabase } from '../lib/supabase';
import { isConnected, getOfflineData, getOfflineHomework } from '../utils/offlineStorage';

type HomeworkDetailScreenRouteProp = RouteProp<RootStackParamList, 'HomeworkDetail'>;
type HomeworkDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeworkDetailScreen = () => {
  const navigation = useNavigation<HomeworkDetailScreenNavigationProp>();
  const route = useRoute<HomeworkDetailScreenRouteProp>();
  const { homeworkId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    loadHomeworkDetail();
  }, [homeworkId]);

  const loadHomeworkDetail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const connected = await isConnected();
      
      if (connected) {
        // 온라인 모드
        try {
          const response = await homeworkAPI.getHomeworkDetail(homeworkId);
          if (response.success) {
            setHomework(response.data.homework);
            setIsOfflineMode(false);
          } else {
            setError('숙제 정보를 불러오는데 실패했습니다.');
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 시 오프라인 데이터 확인
          const offlineHomeworks = await getOfflineHomework();
          const offlineHomework = offlineHomeworks?.find((hw: any) => hw._id === homeworkId);
          
          if (offlineHomework) {
            setHomework(offlineHomework);
            setIsOfflineMode(true);
          } else {
            // 캐시된 데이터 확인
            const cachedHomeworks = await getOfflineData('homeworks');
            const cachedHomework = cachedHomeworks?.find((hw: any) => hw.id === homeworkId);
            
            if (cachedHomework) {
              setHomework(cachedHomework);
              setIsOfflineMode(true);
            } else {
              setError('숙제 정보를 불러올 수 없습니다.');
            }
          }
        }
      } else {
        // 오프라인 모드
        setIsOfflineMode(true);
        
        // 오프라인 데이터 확인
        const offlineHomeworks = await getOfflineHomework();
        const offlineHomework = offlineHomeworks?.find((hw: any) => hw._id === homeworkId);
        
        if (offlineHomework) {
          setHomework(offlineHomework);
        } else {
          // 캐시된 데이터 확인
          const cachedHomeworks = await getOfflineData('homeworks');
          const cachedHomework = cachedHomeworks?.find((hw: any) => hw.id === homeworkId);
          
          if (cachedHomework) {
            setHomework(cachedHomework);
          } else {
            setError('오프라인 모드에서 숙제 정보를 찾을 수 없습니다.');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load homework detail:', error);
      setError('숙제 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    navigation.navigate('HomeworkSubmission', { homeworkId });
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '날짜 없음';
      }
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch (error) {
      console.error('Invalid date format:', dateString);
      return '날짜 없음';
    }
  };

  // 남은 시간 계산
  const getRemainingTime = () => {
    if (!homework?.dueDate) return null;

    try {
      const now = new Date();
      const due = new Date(homework.dueDate);

      if (isNaN(due.getTime())) {
        return null;
      }

      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return '기한 만료';
      } else if (diffDays === 0) {
        // 오늘이 마감일
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        if (diffHours <= 0) {
          return '기한 만료';
        } else if (diffHours < 24) {
          return `${diffHours}시간 남음`;
        }
      } else if (diffDays === 1) {
        return '내일 마감';
      } else {
        return `${diffDays}일 남음`;
      }

      return null;
    } catch (error) {
      console.error('Error calculating remaining time:', error);
      return null;
    }
  };

  // 첨부파일 다운로드 핸들러
  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      if (Platform.OS === 'web') {
        // 웹 환경: fetch로 blob 가져온 후 다운로드
        const response = await fetch(url);
        const blob = await response.blob();

        // MIME 타입을 유지하면서 새 blob 생성
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const typedBlob = new Blob([blob], { type: contentType });
        const blobUrl = window.URL.createObjectURL(typedBlob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // 정리 (약간의 지연 후)
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);

        Alert.alert('성공', '파일이 다운로드되었습니다.');
      } else {
        // 네이티브 환경: expo-file-system으로 파일 다운로드
        const fileUri = FileSystem.documentDirectory + filename;

        // 다운로드 시작 알림
        Alert.alert('다운로드', '파일을 다운로드하는 중입니다...');

        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri
        );

        const result = await downloadResumable.downloadAsync();

        if (!result) {
          Alert.alert('오류', '파일 다운로드에 실패했습니다.');
          return;
        }

        const { uri } = result;

        // 다운로드 완료 후 공유 옵션 제공
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/octet-stream',
            dialogTitle: '파일 저장 또는 공유'
          });
        } else {
          Alert.alert('성공', '파일이 다운로드되었습니다.\n위치: ' + uri);
        }
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
      Alert.alert('오류', '파일 다운로드에 실패했습니다.');
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 파일 아이콘 선택
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) return 'musical-notes-outline';
    if (fileType.startsWith('video/')) return 'videocam-outline';
    if (fileType.startsWith('image/')) return 'image-outline';
    if (fileType.includes('pdf')) return 'document-text-outline';
    return 'document-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  if (error || !homework) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#D32F2F" />
        <Text style={styles.errorText}>{error || '숙제 정보를 불러올 수 없습니다.'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadHomeworkDetail}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remainingTime = getRemainingTime();
  const isOverdue = remainingTime === '기한 만료';
  const canSubmit = !isOverdue && homework.status !== 'completed';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {isOfflineMode && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
            <Text style={styles.offlineBannerText}>오프라인 모드</Text>
          </View>
        )}
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{homework.title}</Text>
            <View style={[
              styles.statusBadge, 
              { 
                backgroundColor: 
                  homework.status === 'pending' ? '#FFA500' : 
                  homework.status === 'submitted' ? '#4F6CFF' : 
                  homework.status === 'completed' ? '#4CAF50' : 
                  homework.status === 'overdue' ? '#FF5252' : '#757575'
              }
            ]}>
              <Text style={styles.statusText}>
                {
                  homework.status === 'pending' ? '진행 중' : 
                  homework.status === 'submitted' ? '제출됨' : 
                  homework.status === 'completed' ? '완료됨' : 
                  homework.status === 'overdue' ? '기한 초과' : '알 수 없음'
                }
              </Text>
            </View>
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color="#757575" />
              <Text style={styles.infoText}>마감일: {formatDate(homework.dueDate)}</Text>
            </View>
            
            {remainingTime && (
              <View style={styles.infoItem}>
                <Ionicons 
                  name="time-outline" 
                  size={16} 
                  color={isOverdue ? '#FF5252' : '#757575'} 
                />
                <Text 
                  style={[
                    styles.infoText, 
                    isOverdue && { color: '#FF5252', fontWeight: '500' }
                  ]}
                >
                  {remainingTime}
                </Text>
              </View>
            )}
            
            <View style={styles.infoItem}>
              <Ionicons 
                name={
                  homework.type === 'audio' ? 'mic-outline' : 
                  homework.type === 'text' ? 'document-text-outline' : 'albums-outline'
                } 
                size={16} 
                color="#757575" 
              />
              <Text style={styles.infoText}>
                {homework.type === 'audio' ? '음성 과제' : 
                 homework.type === 'text' ? '텍스트 과제' : '혼합 과제'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>설명</Text>
          <Text style={styles.description}>{homework.description || '설명이 없습니다.'}</Text>
        </View>

        {/* 첨부파일 섹션 */}
        {homework.resources?.attachments && homework.resources.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.sectionTitle}>
              첨부파일 ({homework.resources.attachments.length}개)
            </Text>
            {homework.resources.attachments.map((attachment: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.attachmentItem}
                onPress={() => handleDownloadAttachment(attachment.url, attachment.name)}
              >
                <View style={styles.attachmentIconContainer}>
                  <Ionicons
                    name={getFileIcon(attachment.type)}
                    size={24}
                    color="#4F6CFF"
                  />
                </View>
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <Text style={styles.attachmentSize}>
                    {formatFileSize(attachment.size)}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#4F6CFF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>과제 내용</Text>
          
          {homework.content?.questions?.map((question: any, index: number) => (
            <View key={question.id || index} style={styles.questionItem}>
              <Text style={styles.questionNumber}>문제 {index + 1}</Text>
              <Text style={styles.questionText}>{question.text}</Text>
              
              {question.type === 'audio' && (
                <View style={styles.audioPrompt}>
                  <Ionicons name="mic-outline" size={20} color="#4F6CFF" />
                  <Text style={styles.audioPromptText}>음성으로 답변하세요</Text>
                </View>
              )}
              
              {question.type === 'text' && (
                <View style={styles.textPrompt}>
                  <Ionicons name="document-text-outline" size={20} color="#4F6CFF" />
                  <Text style={styles.textPromptText}>텍스트로 답변하세요</Text>
                </View>
              )}
            </View>
          ))}
          
          {(!homework.content?.questions || homework.content.questions.length === 0) && (
            <Text style={styles.noContentText}>문제가 없습니다.</Text>
          )}
        </View>
        
        {canSubmit && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>과제 제출하기</Text>
          </TouchableOpacity>
        )}
        
        {isOverdue && (
          <View style={styles.overdueMessage}>
            <Ionicons name="alert-circle" size={20} color="#FF5252" />
            <Text style={styles.overdueMessageText}>
              제출 기한이 지났습니다. 선생님에게 문의하세요.
            </Text>
          </View>
        )}
        
        {homework.status === 'completed' && (
          <View style={styles.completedMessage}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completedMessageText}>
              이미 완료된 과제입니다.
            </Text>
          </View>
        )}

        {/* 선생님 피드백 섹션 */}
        {(homework.status === 'submitted' || homework.status === 'completed') && homework.teacher_feedback && (
          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#4F6CFF" />
              <Text style={styles.feedbackTitle}>선생님 피드백</Text>
            </View>
            <Text style={styles.feedbackText}>{homework.teacher_feedback}</Text>
            {homework.reviewed_at && (
              <Text style={styles.feedbackDate}>
                작성일: {formatDate(homework.reviewed_at)}
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4F6CFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  attachmentsContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  attachmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 4,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#757575',
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F6CFF',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 12,
    lineHeight: 22,
  },
  audioPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  audioPromptText: {
    fontSize: 14,
    color: '#4F6CFF',
    marginLeft: 8,
  },
  textPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textPromptText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  noContentText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#4F6CFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overdueMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  overdueMessageText: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: 8,
  },
  completedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  completedMessageText: {
    color: '#2E7D32',
    fontSize: 14,
    marginLeft: 8,
  },
  feedbackContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F6CFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F6CFF',
    marginLeft: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#212121',
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
});

export default HomeworkDetailScreen;