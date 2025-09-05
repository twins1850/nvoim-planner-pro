import React, { useState, useEffect } from 'react';
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

// 컴포넌트
import AudioRecorder from '../components/AudioRecorder';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { homeworkAPI } from '../services/supabaseApi';
import { 
  isConnected, 
  getOfflineData, 
  getOfflineHomework,
  saveOfflineSubmission,
  addToOfflineQueue,
  isOfflineMode,
  setOfflineMode
} from '../utils/offlineStorage';

type HomeworkSubmissionScreenRouteProp = RouteProp<RootStackParamList, 'HomeworkSubmission'>;
type HomeworkSubmissionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeworkSubmissionScreen = () => {
  const navigation = useNavigation<HomeworkSubmissionScreenNavigationProp>();
  const route = useRoute<HomeworkSubmissionScreenRouteProp>();
  const { homeworkId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homework, setHomework] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    loadHomeworkDetail();
  }, [homeworkId]);

  const loadHomeworkDetail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 오프라인 모드 상태 확인
      const offlineModeEnabled = await isOfflineMode();
      setIsOfflineMode(offlineModeEnabled);
      
      // 네트워크 연결 상태 확인
      const connected = await isConnected();
      
      if (connected && !offlineModeEnabled) {
        // 온라인 모드
        try {
          const response = await homeworkAPI.getHomeworkDetail(homeworkId);
          if (response.success) {
            const homeworkData = response.data.homework;
            setHomework(homeworkData);
            
            // 답변 초기화
            if (homeworkData.content?.questions) {
              const initialAnswers = homeworkData.content.questions.map((q: any) => ({
                questionId: q.id,
                type: q.type,
                answer: '',
                audioFile: null
              }));
              setAnswers(initialAnswers);
            }
          } else {
            setError('숙제 정보를 불러오는데 실패했습니다.');
            // 오류 발생 시 오프라인 데이터 확인
            await loadOfflineHomework();
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 시 오프라인 모드로 자동 전환
          await setOfflineMode(true);
          setIsOfflineMode(true);
          
          // 오프라인 데이터 확인
          await loadOfflineHomework();
        }
      } else {
        // 오프라인 모드
        setIsOfflineMode(true);
        await loadOfflineHomework();
      }
    } catch (error) {
      console.error('Failed to load homework detail:', error);
      setError('숙제 정보를 불러오는 중 오류가 발생했습니다.');
      
      // 오류 발생 시에도 오프라인 데이터 확인 시도
      try {
        await loadOfflineHomework();
      } catch (offlineError) {
        console.error('Failed to load offline homework:', offlineError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineHomework = async () => {
    // 오프라인 데이터 확인
    const offlineHomeworks = await getOfflineHomework();
    const offlineHomework = offlineHomeworks?.find((hw: any) => hw._id === homeworkId);
    
    if (offlineHomework) {
      setHomework(offlineHomework);
      
      // 답변 초기화
      if (offlineHomework.content?.questions) {
        const initialAnswers = offlineHomework.content.questions.map((q: any) => ({
          questionId: q.id,
          type: q.type,
          answer: '',
          audioFile: null
        }));
        setAnswers(initialAnswers);
      }
    } else {
      // 캐시된 데이터 확인
      const cachedHomeworks = await getOfflineData('homeworks');
      const cachedHomework = cachedHomeworks?.find((hw: any) => hw.id === homeworkId);
      
      if (cachedHomework) {
        setHomework(cachedHomework);
        
        // 답변 초기화
        if (cachedHomework.content?.questions) {
          const initialAnswers = cachedHomework.content.questions.map((q: any) => ({
            questionId: q.id,
            type: q.type,
            answer: '',
            audioFile: null
          }));
          setAnswers(initialAnswers);
        }
      } else {
        setError('오프라인 모드에서 숙제 정보를 찾을 수 없습니다.');
      }
    }
  };

  const handleTextAnswerChange = (text: string, index: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[index] = {
      ...updatedAnswers[index],
      answer: text
    };
    setAnswers(updatedAnswers);
  };

  const handleAudioRecordingComplete = (audioFile: any, index: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[index] = {
      ...updatedAnswers[index],
      audioFile
    };
    setAnswers(updatedAnswers);
  };

  const handleSubmit = async () => {
    // 답변 검증
    const unansweredQuestions = answers.filter((answer, index) => {
      const question = homework.content?.questions[index];
      if (question.type === 'audio') {
        return !answer.audioFile;
      } else {
        return !answer.answer.trim();
      }
    });
    
    if (unansweredQuestions.length > 0) {
      Alert.alert(
        '미완성된 답변',
        '모든 문제에 답변해주세요.',
        [{ text: '확인' }]
      );
      return;
    }
    
    setSubmitting(true);
    
    try {
      const connected = await isConnected();
      
      if (connected && !isOfflineMode) {
        // 온라인 제출
        try {
          const submissionData = {
            answers: answers.map(answer => ({
              questionId: answer.questionId,
              answer: answer.answer,
              audioFile: answer.audioFile
            }))
          };
          
          const response = await homeworkAPI.submitHomework(homeworkId, submissionData);
          
          if (response.success) {
            Alert.alert(
              '제출 완료',
              '숙제가 성공적으로 제출되었습니다.',
              [
                { 
                  text: '확인', 
                  onPress: () => navigation.navigate('Main', { screen: 'Homework' }) 
                }
              ]
            );
          } else {
            Alert.alert(
              '제출 실패',
              response.error?.message || '숙제 제출에 실패했습니다.',
              [{ text: '확인' }]
            );
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 시 오프라인 저장 제안
          Alert.alert(
            '제출 실패',
            '서버 연결에 문제가 있습니다. 오프라인으로 저장하시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              { 
                text: '오프라인 저장', 
                onPress: () => saveSubmissionOffline() 
              }
            ]
          );
        }
      } else {
        // 오프라인 저장
        await saveSubmissionOffline();
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

  const saveSubmissionOffline = async () => {
    try {
      // 오프라인 제출 데이터 저장
      const submissionData = {
        answers: answers.map(answer => ({
          questionId: answer.questionId,
          answer: answer.answer,
          audioFile: answer.audioFile
        }))
      };
      
      const submissionId = await saveOfflineSubmission(homeworkId, submissionData);
      
      // 오프라인 큐에 추가
      await addToOfflineQueue(
        `/homework-submission/${homeworkId}`,
        'POST',
        submissionData
      );
      
      Alert.alert(
        '오프라인 저장 완료',
        '숙제가 오프라인으로 저장되었습니다. 인터넷 연결 시 자동으로 제출됩니다.',
        [
          { 
            text: '확인', 
            onPress: () => navigation.navigate('Main', { screen: 'Homework' }) 
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save offline submission:', error);
      Alert.alert(
        '오류',
        '오프라인 저장 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
    }
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < (homework?.content?.questions?.length || 0)) {
      setActiveQuestionIndex(index);
    }
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

  const questions = homework.content?.questions || [];
  const currentQuestion = questions[activeQuestionIndex];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {isOfflineMode && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
              <Text style={styles.offlineBannerText}>오프라인 모드</Text>
            </View>
          )}
          
          <View style={styles.header}>
            <Text style={styles.title}>{homework.title}</Text>
            <Text style={styles.subtitle}>
              {questions.length}개의 문제 중 {activeQuestionIndex + 1}번째 문제
            </Text>
          </View>
          
          {questions.length > 0 ? (
            <View style={styles.questionContainer}>
              <Text style={styles.questionNumber}>문제 {activeQuestionIndex + 1}</Text>
              <Text style={styles.questionText}>{currentQuestion.text}</Text>
              
              {currentQuestion.type === 'audio' ? (
                <View style={styles.answerContainer}>
                  <Text style={styles.answerLabel}>음성 답변</Text>
                  
                  {answers[activeQuestionIndex]?.audioFile ? (
                    // 이미 녹음된 경우 정보 표시
                    <View>
                      <View style={styles.audioFileInfo}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.audioFileText}>
                          음성 녹음 완료
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.rerecordButton}
                        onPress={() => {
                          // 녹음 다시 하기
                          const updatedAnswers = [...answers];
                          updatedAnswers[activeQuestionIndex] = {
                            ...updatedAnswers[activeQuestionIndex],
                            audioFile: null
                          };
                          setAnswers(updatedAnswers);
                        }}
                      >
                        <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.rerecordButtonText}>다시 녹음하기</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // 녹음 컴포넌트 표시
                    <AudioRecorder
                      onRecordingComplete={(audioFile) => 
                        handleAudioRecordingComplete(audioFile, activeQuestionIndex)
                      }
                      maxDuration={300} // 5분
                    />
                  )}
                </View>
              ) : (
                <View style={styles.answerContainer}>
                  <Text style={styles.answerLabel}>텍스트 답변</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="답변을 입력하세요..."
                    placeholderTextColor="#9E9E9E"
                    multiline
                    value={answers[activeQuestionIndex]?.answer || ''}
                    onChangeText={(text) => handleTextAnswerChange(text, activeQuestionIndex)}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="help-circle-outline" size={64} color="#BDBDBD" />
              <Text style={styles.emptyStateText}>문제가 없습니다.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {questions.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, activeQuestionIndex === 0 && styles.disabledButton]}
              onPress={() => navigateToQuestion(activeQuestionIndex - 1)}
              disabled={activeQuestionIndex === 0}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={activeQuestionIndex === 0 ? '#BDBDBD' : '#4F6CFF'} 
              />
              <Text 
                style={[
                  styles.navButtonText, 
                  activeQuestionIndex === 0 && styles.disabledButtonText
                ]}
              >
                이전
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.pageIndicator}>
              {activeQuestionIndex + 1} / {questions.length}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.navButton, 
                activeQuestionIndex === questions.length - 1 && styles.disabledButton
              ]}
              onPress={() => navigateToQuestion(activeQuestionIndex + 1)}
              disabled={activeQuestionIndex === questions.length - 1}
            >
              <Text 
                style={[
                  styles.navButtonText, 
                  activeQuestionIndex === questions.length - 1 && styles.disabledButtonText
                ]}
              >
                다음
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color={activeQuestionIndex === questions.length - 1 ? '#BDBDBD' : '#4F6CFF'} 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>제출하기</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
  },
  questionContainer: {
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
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F6CFF',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 16,
    lineHeight: 22,
  },
  answerContainer: {
    marginTop: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
    color: '#212121',
    textAlignVertical: 'top',
  },
  audioFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  audioFileText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
  },
  rerecordButton: {
    backgroundColor: '#FF5252',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  rerecordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F6CFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#BDBDBD',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#757575',
  },
  submitButton: {
    backgroundColor: '#4F6CFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeworkSubmissionScreen;