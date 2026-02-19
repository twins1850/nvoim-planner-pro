import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isConnected, isOfflineMode, setOfflineMode } from '../utils/offlineStorage';
import { testServerConnection, testApiEndpoint } from '../utils/serverConnectionTest';

const ServerTestScreen = () => {
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [responseData, setResponseData] = useState<any>(null);
  const [offlineMode, setOfflineModeState] = useState(false);
  const [networkConnected, setNetworkConnected] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // 네트워크 연결 상태 확인
      const connected = await isConnected();
      setNetworkConnected(connected);

      // 오프라인 모드 상태 확인
      const offline = await isOfflineMode();
      setOfflineModeState(offline);

      if (!connected) {
        setServerStatus('offline');
        return;
      }

      // 서버 상태 확인
      await testServerConnectionHandler();
    } catch (error) {
      console.error('상태 확인 오류:', error);
    }
  };

  const testServerConnectionHandler = async () => {
    setLoading(true);
    try {
      const result = await testServerConnection();
      
      if (result.success) {
        setServerStatus('online');
        setResponseData(result.data);
        console.log('Supabase 연결 성공:', result.data);
      } else {
        setServerStatus('offline');
        setResponseData({ error: result.message });
        console.log('Supabase 연결 실패:', result.message);
      }
    } catch (error) {
      console.error('서버 연결 테스트 오류:', error);
      setServerStatus('offline');
      setResponseData({ error: '서버 연결 테스트 실패' });
    } finally {
      setLoading(false);
    }
  };

  const toggleOfflineMode = async () => {
    try {
      const newMode = !offlineMode;
      await setOfflineMode(newMode);
      setOfflineModeState(newMode);
      Alert.alert(
        '알림',
        newMode ? '오프라인 모드가 활성화되었습니다.' : '오프라인 모드가 비활성화되었습니다.'
      );
    } catch (error) {
      console.error('오프라인 모드 전환 오류:', error);
      Alert.alert('오류', '오프라인 모드 전환 중 오류가 발생했습니다.');
    }
  };

  const testAuthStatus = async () => {
    setLoading(true);
    try {
      const result = await testApiEndpoint();
      
      if (result.success) {
        setResponseData(result.data);
        Alert.alert('인증 성공', result.message);
      } else {
        setResponseData({ error: result.message });
        Alert.alert('인증 실패', result.message);
      }
    } catch (error) {
      console.error('인증 테스트 오류:', error);
      setResponseData({ error: '인증 테스트 실패' });
      Alert.alert('오류', '인증 테스트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getServerInfo = () => {
    switch (serverStatus) {
      case 'online':
        return {
          icon: 'checkmark-circle',
          color: '#4CAF50',
          text: '서버 연결됨',
        };
      case 'offline':
        return {
          icon: 'close-circle',
          color: '#F44336',
          text: '서버 연결 안됨',
        };
      default:
        return {
          icon: 'help-circle',
          color: '#9E9E9E',
          text: '서버 상태 확인 중',
        };
    }
  };

  const serverInfo = getServerInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>서버 연결 테스트</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>네트워크 연결:</Text>
          <View style={styles.statusValue}>
            <Ionicons
              name={networkConnected ? 'wifi' : 'wifi-outline'}
              size={24}
              color={networkConnected ? '#4CAF50' : '#F44336'}
            />
            <Text style={styles.statusText}>
              {networkConnected ? '연결됨' : '연결 안됨'}
            </Text>
          </View>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>서버 상태:</Text>
          <View style={styles.statusValue}>
            <Ionicons name={serverInfo.icon as any} size={24} color={serverInfo.color} />
            <Text style={styles.statusText}>{serverInfo.text}</Text>
          </View>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>오프라인 모드:</Text>
          <View style={styles.statusValue}>
            <Ionicons
              name={offlineMode ? 'cloud-offline' : 'cloud-done'}
              size={24}
              color={offlineMode ? '#FF9800' : '#4CAF50'}
            />
            <Text style={styles.statusText}>
              {offlineMode ? '활성화됨' : '비활성화됨'}
            </Text>
          </View>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Database:</Text>
          <Text style={styles.apiUrl}>Supabase</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={checkStatus}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>상태 확인</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: offlineMode ? '#4CAF50' : '#FF9800' }]}
          onPress={toggleOfflineMode}
          disabled={loading}
        >
          <Ionicons
            name={offlineMode ? 'cloud-done' : 'cloud-offline'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.buttonText}>
            {offlineMode ? '온라인 모드로 전환' : '오프라인 모드로 전환'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#2196F3' }]}
          onPress={testAuthStatus}
          disabled={loading}
        >
          <Ionicons name="person-circle" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>인증 상태 확인</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.responseContainer}>
        <Text style={styles.responseTitle}>서버 응답:</Text>
        <ScrollView style={styles.responseScroll}>
          {responseData ? (
            <Text style={styles.responseText}>
              {JSON.stringify(responseData, null, 2)}
            </Text>
          ) : (
            <Text style={styles.noResponseText}>응답 데이터가 없습니다.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusLabel: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#424242',
  },
  apiUrl: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F6CFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  responseContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  responseScroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 4,
    padding: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#424242',
    fontFamily: 'monospace',
  },
  noResponseText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ServerTestScreen;