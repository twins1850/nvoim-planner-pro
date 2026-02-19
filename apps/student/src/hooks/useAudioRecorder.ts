import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { saveOfflineAudioFile } from '../utils/offlineStorage';

interface AudioRecorderState {
  recording: Audio.Recording | null;
  isRecording: boolean;
  recordingDuration: number;
  audioUri: string | null;
  sound: Audio.Sound | null;
  isPlaying: boolean;
  error: string | null;
}

interface PlaybackStatus {
  didJustFinish?: boolean;
  [key: string]: any;
}

export const useAudioRecorder = () => {
  const [state, setState] = useState<AudioRecorderState>({
    recording: null,
    isRecording: false,
    recordingDuration: 0,
    audioUri: null,
    sound: null,
    isPlaying: false,
    error: null,
  });

  const [durationInterval, setDurationInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 정리
      if (durationInterval) clearInterval(durationInterval);
      stopRecording();
      if (state.sound) {
        state.sound.unloadAsync();
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setState(prev => ({ ...prev, error: '오디오 녹음 권한이 필요합니다.' }));
        return false;
      }
      return true;
    } catch (error) {
      setState(prev => ({ ...prev, error: '권한 요청 중 오류가 발생했습니다.' }));
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // 오디오 세션 설정 (웹 환경 고려)
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      }

      // 녹음 시작
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // 녹음 시간 측정 시작
      const interval = setInterval(() => {
        setState(prev => ({ ...prev, recordingDuration: prev.recordingDuration + 1 }));
      }, 1000);

      setDurationInterval(interval);
      setState(prev => ({ 
        ...prev, 
        recording, 
        isRecording: true, 
        recordingDuration: 0,
        audioUri: null,
        error: null 
      }));
    } catch (error) {
      console.error('Failed to start recording', error);
      setState(prev => ({ ...prev, error: '녹음을 시작할 수 없습니다.' }));
    }
  };

  const stopRecording = async () => {
    try {
      if (!state.recording) return;

      // 녹음 중지
      await state.recording.stopAndUnloadAsync();
      
      // 녹음 시간 측정 중지
      if (durationInterval) {
        clearInterval(durationInterval);
        setDurationInterval(null);
      }

      // 녹음 파일 URI 가져오기
      const uri = state.recording.getURI();

      // 오디오 세션 재설정 (웹 환경 고려)
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      }

      setState(prev => ({ 
        ...prev, 
        recording: null, 
        isRecording: false, 
        audioUri: uri 
      }));

      return uri;
    } catch (error) {
      console.error('Failed to stop recording', error);
      setState(prev => ({ 
        ...prev, 
        recording: null, 
        isRecording: false,
        error: '녹음을 중지할 수 없습니다.' 
      }));
    }
  };

  const playRecording = async () => {
    try {
      if (!state.audioUri) return;

      // 이미 재생 중인 경우 중지
      if (state.sound) {
        await state.sound.unloadAsync();
      }

      // 녹음된 오디오 로드
      const { sound } = await Audio.Sound.createAsync(
        { uri: state.audioUri },
        { shouldPlay: true }
      );

      // 재생 완료 이벤트 처리
      sound.setOnPlaybackStatusUpdate((status: PlaybackStatus) => {
        if (status.didJustFinish) {
          setState(prev => ({ ...prev, isPlaying: false }));
        }
      });

      setState(prev => ({ ...prev, sound, isPlaying: true }));
    } catch (error) {
      console.error('Failed to play recording', error);
      setState(prev => ({ ...prev, error: '녹음을 재생할 수 없습니다.' }));
    }
  };

  const stopPlaying = async () => {
    try {
      if (!state.sound) return;
      
      await state.sound.stopAsync();
      await state.sound.unloadAsync();
      
      setState(prev => ({ ...prev, sound: null, isPlaying: false }));
    } catch (error) {
      console.error('Failed to stop playing', error);
      setState(prev => ({ ...prev, error: '재생을 중지할 수 없습니다.' }));
    }
  };

  const getAudioFileInfo = async () => {
    if (!state.audioUri) return null;

    try {
      // 웹 환경에서는 Blob API 사용
      if (Platform.OS === 'web') {
        const response = await fetch(state.audioUri);
        const blob = await response.blob();
        return {
          exists: true,
          size: blob.size,
          uri: state.audioUri
        };
      }

      // 네이티브 환경에서는 FileSystem 사용
      const fileInfo = await FileSystem.getInfoAsync(state.audioUri);
      return fileInfo;
    } catch (error) {
      console.error('Failed to get audio file info', error);
      return null;
    }
  };

  const prepareAudioForUpload = async () => {
    if (!state.audioUri) return null;
    
    try {
      const fileInfo = await getAudioFileInfo();
      if (!fileInfo) return null;
      
      // 파일 이름 생성
      const fileName = `audio_${new Date().getTime()}.${Platform.OS === 'ios' ? 'm4a' : 'mp4'}`;
      
      // 오프라인 저장
      const fileId = await saveOfflineAudioFile(state.audioUri, {
        name: fileName,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        size: fileInfo.exists ? fileInfo.size : 0,
        duration: state.recordingDuration,
        createdAt: new Date().toISOString()
      });
      
      return {
        uri: state.audioUri,
        name: fileName,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        size: fileInfo.exists ? fileInfo.size : 0,
        offlineFileId: fileId
      };
    } catch (error) {
      console.error('Failed to prepare audio for upload', error);
      return null;
    }
  };

  const resetRecording = () => {
    setState({
      recording: null,
      isRecording: false,
      recordingDuration: 0,
      audioUri: null,
      sound: null,
      isPlaying: false,
      error: null,
    });
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    playRecording,
    stopPlaying,
    getAudioFileInfo,
    prepareAudioForUpload,
    resetRecording,
  };
};