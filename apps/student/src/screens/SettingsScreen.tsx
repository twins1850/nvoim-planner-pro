import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications: {
      enabled: true,
      homework: true,
      feedback: true,
      reminders: true,
      system: true
    },
    audio: {
      highQuality: false,
      autoSave: true,
      maxDuration: 300 // 초 단위 (5분)
    },
    display: {
      darkMode: false,
      largeText: false,
      highContrast: false
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const savedSettings = await AsyncStorage.getItem('user_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings', error);
      Alert.alert('오류', '설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      await AsyncStorage.setItem('user_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings', error);
      Alert.alert('오류', '설정을 저장하는 중 오류가 발생했습니다.');
    }
  };

  const updateNotificationSetting = (key: string, value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    };
    
    // 모든 알림이 꺼져있으면 enabled도 false로 설정
    if (key !== 'enabled' && !value) {
      const allDisabled = Object.keys(newSettings.notifications)
        .filter(k => k !== 'enabled')
        .every(k => !newSettings.notifications[k as keyof typeof newSettings.notifications]);
      
      if (allDisabled) {
        newSettings.notifications.enabled = false;
      }
    }
    
    // enabled가 true로 변경되면 최소한 하나의 알림은 활성화
    if (key === 'enabled' && value) {
      const allDisabled = Object.keys(newSettings.notifications)
        .filter(k => k !== 'enabled')
        .every(k => !newSettings.notifications[k as keyof typeof newSettings.notifications]);
      
      if (allDisabled) {
        newSettings.notifications.homework = true;
      }
    }
    
    saveSettings(newSettings);
  };

  const updateAudioSetting = (key: string, value: any) => {
    const newSettings = {
      ...settings,
      audio: {
        ...settings.audio,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };


  const updateDisplaySetting = (key: string, value: boolean) => {
    const newSettings = {
      ...settings,
      display: {
        ...settings.display,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const clearCache = async () => {
    Alert.alert(
      '캐시 삭제',
      '모든 임시 파일과 캐시를 삭제하시겠습니까? 로그인 정보는 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 캐시 데이터 삭제
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(key => 
                key.includes('cache') || 
                key.includes('temp') || 
                key.includes('audio_files')
              );
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }
              
              Alert.alert('완료', '캐시가 성공적으로 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to clear cache', error);
              Alert.alert('오류', '캐시 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>알림 활성화</Text>
          <Switch
            value={settings.notifications.enabled}
            onValueChange={(value) => updateNotificationSetting('enabled', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={[
          styles.settingItem, 
          !settings.notifications.enabled && styles.disabledSetting
        ]}>
          <Text style={[
            styles.settingLabel,
            !settings.notifications.enabled && styles.disabledText
          ]}>
            숙제 알림
          </Text>
          <Switch
            value={settings.notifications.homework}
            onValueChange={(value) => updateNotificationSetting('homework', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
            disabled={!settings.notifications.enabled}
          />
        </View>
        
        <View style={[
          styles.settingItem, 
          !settings.notifications.enabled && styles.disabledSetting
        ]}>
          <Text style={[
            styles.settingLabel,
            !settings.notifications.enabled && styles.disabledText
          ]}>
            피드백 알림
          </Text>
          <Switch
            value={settings.notifications.feedback}
            onValueChange={(value) => updateNotificationSetting('feedback', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
            disabled={!settings.notifications.enabled}
          />
        </View>
        
        <View style={[
          styles.settingItem, 
          !settings.notifications.enabled && styles.disabledSetting
        ]}>
          <Text style={[
            styles.settingLabel,
            !settings.notifications.enabled && styles.disabledText
          ]}>
            마감일 리마인더
          </Text>
          <Switch
            value={settings.notifications.reminders}
            onValueChange={(value) => updateNotificationSetting('reminders', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
            disabled={!settings.notifications.enabled}
          />
        </View>
        
        <View style={[
          styles.settingItem, 
          !settings.notifications.enabled && styles.disabledSetting
        ]}>
          <Text style={[
            styles.settingLabel,
            !settings.notifications.enabled && styles.disabledText
          ]}>
            시스템 알림
          </Text>
          <Switch
            value={settings.notifications.system}
            onValueChange={(value) => updateNotificationSetting('system', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
            disabled={!settings.notifications.enabled}
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오디오 설정</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>고품질 녹음</Text>
          <Switch
            value={settings.audio.highQuality}
            onValueChange={(value) => updateAudioSetting('highQuality', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>자동 저장</Text>
          <Switch
            value={settings.audio.autoSave}
            onValueChange={(value) => updateAudioSetting('autoSave', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>최대 녹음 시간</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                settings.audio.maxDuration === 180 && styles.pickerOptionSelected
              ]}
              onPress={() => updateAudioSetting('maxDuration', 180)}
            >
              <Text style={[
                styles.pickerOptionText,
                settings.audio.maxDuration === 180 && styles.pickerOptionTextSelected
              ]}>
                3분
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.pickerOption,
                settings.audio.maxDuration === 300 && styles.pickerOptionSelected
              ]}
              onPress={() => updateAudioSetting('maxDuration', 300)}
            >
              <Text style={[
                styles.pickerOptionText,
                settings.audio.maxDuration === 300 && styles.pickerOptionTextSelected
              ]}>
                5분
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.pickerOption,
                settings.audio.maxDuration === 600 && styles.pickerOptionSelected
              ]}
              onPress={() => updateAudioSetting('maxDuration', 600)}
            >
              <Text style={[
                styles.pickerOptionText,
                settings.audio.maxDuration === 600 && styles.pickerOptionTextSelected
              ]}>
                10분
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>화면 설정</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>다크 모드</Text>
          <Switch
            value={settings.display.darkMode}
            onValueChange={(value) => updateDisplaySetting('darkMode', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>큰 글씨</Text>
          <Switch
            value={settings.display.largeText}
            onValueChange={(value) => updateDisplaySetting('largeText', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>고대비 모드</Text>
          <Switch
            value={settings.display.highContrast}
            onValueChange={(value) => updateDisplaySetting('highContrast', value)}
            trackColor={{ false: '#E0E0E0', true: '#4F6CFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={clearCache}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
          <Text style={styles.actionButtonText}>캐시 삭제</Text>
        </TouchableOpacity>
        
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ServerTest' as never)}
        >
          <Ionicons name="server-outline" size={20} color="#4CAF50" />
          <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>서버 연결 테스트</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>앤보임 영어회화 앱 v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
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
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  disabledSetting: {
    opacity: 0.5,
  },
  settingLabel: {
    fontSize: 16,
    color: '#212121',
  },
  disabledText: {
    color: '#9E9E9E',
  },
  pickerContainer: {
    flexDirection: 'row',
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginLeft: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#4F6CFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#757575',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#F44336',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
});

export default SettingsScreen;