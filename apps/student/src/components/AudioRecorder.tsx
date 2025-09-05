import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { isConnected, isOfflineMode, setOfflineMode } from '../utils/offlineStorage';

interface AudioRecorderProps {
  onRecordingComplete?: (audioFile: any) => void;
  maxDuration?: number; // 최대 녹음 시간 (초)
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onRecordingComplete,
  maxDuration = 300 // 기본값 5분
}) => {
  const {
    isRecording,
    recordingDuration,
    audioUri,
    isPlaying,
    error,
    startRecording,
    stopRecording,
    playRecording,
    stopPlaying,
    resetRecording,
    prepareAudioForUpload
  } = useAudioRecorder();
  
  const [isProcessing, setIsProcessing] = useState(false);

  // 녹음 시간 포맷팅 (초 -> 분:초)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 컴포넌트 마운트 시 오프라인 모드 확인
  useEffect(() => {
    const checkOfflineStatus = async () => {
      try {
        const offlineModeEnabled = await isOfflineMode();
        if (offlineModeEnabled) {
          console.log('오프라인 모드에서 녹음 컴포넌트 초기화');
        }
      } catch (error) {
        console.error('Failed to check offline mode:', error);
      }
    };
    
    checkOfflineStatus();
  }, []);

  // 녹음 시작 처리
  const handleStartRecording = async () => {
    try {
      // 네트워크 연결 확인
      const connected = await isConnected();
      const offlineModeEnabled = await isOfflineMode();
      
      if (!connected || offlineModeEnabled) {
        // 오프라인 모드에서는 바로 알림 없이 녹음 시작
        if (offlineModeEnabled) {
          startRecording();
        } else {
          // 네트워크 연결은 없지만 오프라인 모드가 아닌 경우 알림 표시
          Alert.alert(
            '오프라인 모드',
            '현재 오프라인 모드입니다. 녹음은 가능하지만 서버에 업로드되지 않을 수 있습니다.',
            [
              { text: '취소', style: 'cancel' },
              { 
                text: '계속', 
                onPress: async () => {
                  // 오프라인 모드로 자동 전환
                  await setOfflineMode(true);
                  startRecording();
                }
              }
            ]
          );
        }
      } else {
        // 온라인 모드에서 녹음 시작
        startRecording();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
    }
  };

  // 녹음 완료 처리
  const handleStopRecording = async () => {
    await stopRecording();
  };

  // 녹음 제출 처리
  const handleSubmitRecording = async () => {
    if (!audioUri) {
      Alert.alert('오류', '녹음된 오디오가 없습니다.');
      return;
    }
    
    setIsProcessing(true);
    try {
      // 오프라인 모드 확인
      const offlineModeEnabled = await isOfflineMode();
      
      // 오디오 파일 준비
      const audioFile = await prepareAudioForUpload();
      
      if (audioFile) {
        // 오프라인 모드 표시
        if (offlineModeEnabled) {
          audioFile.isOffline = true;
        }
        
        // 콜백 함수 호출
        if (onRecordingComplete) {
          onRecordingComplete(audioFile);
        }
        
        // 성공 메시지 표시
        if (offlineModeEnabled) {
          console.log('오프라인 모드에서 녹음 저장 완료');
        } else {
          console.log('녹음 제출 완료');
        }
      } else {
        throw new Error('오디오 파일 준비 실패');
      }
    } catch (error) {
      console.error('Failed to submit recording', error);
      Alert.alert('오류', '녹음 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 최대 녹음 시간 초과 시 자동 중지
  React.useEffect(() => {
    if (isRecording && recordingDuration >= maxDuration) {
      Alert.alert('알림', '최대 녹음 시간에 도달했습니다.');
      handleStopRecording();
    }
  }, [isRecording, recordingDuration, maxDuration]);

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.durationContainer}>
        <Text style={styles.durationText}>
          {formatDuration(recordingDuration)}
        </Text>
        {maxDuration && (
          <Text style={styles.maxDurationText}>
            최대: {formatDuration(maxDuration)}
          </Text>
        )}
      </View>

      <View style={styles.controlsContainer}>
        {!audioUri ? (
          // 녹음 전 또는 녹음 중 상태
          <>
            {isRecording ? (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopRecording}
              >
                <Ionicons name="square" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.recordButton]}
                onPress={handleStartRecording}
              >
                <Ionicons name="mic" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          // 녹음 완료 후 상태
          <View style={styles.playbackContainer}>
            <TouchableOpacity
              style={[styles.button, styles.playButton]}
              onPress={isPlaying ? stopPlaying : playRecording}
              disabled={isProcessing}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={resetRecording}
              disabled={isProcessing}
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmitRecording}
              disabled={isProcessing}
            >
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <ActivityIndicator size="small" color="#FF5252" />
          <Text style={styles.recordingText}>녹음 중...</Text>
        </View>
      )}
      
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#4F6CFF" />
          <Text style={styles.processingText}>처리 중...</Text>
        </View>
      )}
      
      {audioUri && !isProcessing && (
        <Text style={styles.helpText}>
          녹음을 확인한 후 체크 버튼을 눌러 제출하세요.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  durationContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#212121',
  },
  maxDurationText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 8,
  },
  recordButton: {
    backgroundColor: '#4F6CFF',
  },
  stopButton: {
    backgroundColor: '#FF5252',
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#757575',
  },
  submitButton: {
    backgroundColor: '#4F6CFF',
  },
  playbackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  recordingText: {
    color: '#FF5252',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  processingText: {
    color: '#4F6CFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  helpText: {
    color: '#757575',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AudioRecorder;