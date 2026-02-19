import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// 컴포넌트
import AudioRecorder from '../components/AudioRecorder';

// 타입
import { RootStackParamList } from '../navigation/types';

// 유틸리티
import { saveOfflineAudioFile } from '../utils/offlineStorage';

type AudioRecordingScreenRouteProp = RouteProp<RootStackParamList, 'AudioRecording'>;
type AudioRecordingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AudioRecordingScreen = () => {
  const navigation = useNavigation<AudioRecordingScreenNavigationProp>();
  const route = useRoute<AudioRecordingScreenRouteProp>();
  const { homeworkId, questionId } = route.params as { homeworkId: string; questionId?: string };
  
  const [audioFile, setAudioFile] = useState<any>(null);

  const handleRecordingComplete = async (audioFile: any) => {
    setAudioFile(audioFile);
  };

  const handleSave = async () => {
    if (!audioFile) {
      Alert.alert('알림', '녹음된 오디오가 없습니다.');
      return;
    }
    
    try {
      // 오프라인 저장
      await saveOfflineAudioFile(audioFile.uri, {
        homeworkId,
        questionId,
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size,
        createdAt: new Date().toISOString()
      });
      
      // 이전 화면으로 돌아가기
      navigation.goBack();
      
      // 결과 전달
      // 실제 구현에서는 이벤트 에미터나 콜백을 사용하여 결과 전달
    } catch (error) {
      console.error('Failed to save audio file:', error);
      Alert.alert('오류', '오디오 파일 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>오디오 녹음</Text>
          <Text style={styles.subtitle}>
            녹음을 시작하려면 마이크 버튼을 누르세요.
          </Text>
        </View>
        
        <View style={styles.recorderContainer}>
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            maxDuration={300} // 5분
          />
        </View>
        
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>녹음 팁</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="mic-outline" size={20} color="#4F6CFF" />
            <Text style={styles.instructionText}>
              조용한 환경에서 녹음하세요.
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="volume-high-outline" size={20} color="#4F6CFF" />
            <Text style={styles.instructionText}>
              명확하고 또렷하게 말하세요.
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time-outline" size={20} color="#4F6CFF" />
            <Text style={styles.instructionText}>
              최대 녹음 시간은 5분입니다.
            </Text>
          </View>
        </View>
        
        {audioFile && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>저장하기</Text>
          </TouchableOpacity>
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
    fontSize: 16,
    color: '#757575',
  },
  recorderContainer: {
    marginBottom: 24,
  },
  instructionsContainer: {
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
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#4F6CFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AudioRecordingScreen;