import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { profileAPI } from '../services/supabaseApi';
import { supabase } from '../lib/supabase';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    
    // 화면 포커스 시 데이터 새로고침
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // API에서 최신 프로필 정보 가져오기
      const response = await profileAPI.getProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('프로필 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // 웹 환경에서는 window.confirm 사용, 모바일에서는 Alert 사용
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('정말 로그아웃 하시겠습니까?');
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert(
        '로그아웃',
        '정말 로그아웃 하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '로그아웃', 
            style: 'destructive',
            onPress: performLogout
          }
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      console.log('로그아웃 시작...');
      
      // 1. Supabase 인증 해제
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase 로그아웃 오류:', error);
      } else {
        console.log('Supabase 로그아웃 완료');
      }
      
      // 2. 모든 로컬 데이터 제거
      await AsyncStorage.clear();
      console.log('AsyncStorage 정리 완료');
      
      // 3. 웹 환경에서는 localStorage도 삭제
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        console.log('localStorage 정리 완료');
      }
      
      // 4. 앱 재시작 또는 인증 화면으로 이동
      if (Platform.OS === 'web') {
        console.log('페이지 새로고침으로 재시작');
        window.location.reload();
      } else {
        console.log('네비게이션 리셋');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' as any }],
        });
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      if (Platform.OS === 'web') {
        alert('로그아웃 중 오류가 발생했습니다.');
      } else {
        Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
      }
    }
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  const navigateToNotifications = () => {
    navigation.navigate('Notifications');
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
      <View style={styles.header}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            {profile?.avatar ? (
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name || '이름 없음'}</Text>
            <Text style={styles.email}>{profile?.email || '이메일 없음'}</Text>
            <Text style={styles.level}>레벨: {profile?.learningLevel || '초급'}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={navigateToSettings}
        >
          <Ionicons name="settings-outline" size={24} color="#212121" />
          <Text style={styles.menuText}>설정</Text>
          <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={navigateToNotifications}
        >
          <Ionicons name="notifications-outline" size={24} color="#212121" />
          <Text style={styles.menuText}>알림</Text>
          <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>버전 1.0.0</Text>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F6CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  level: {
    fontSize: 14,
    color: '#4F6CFF',
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  menuText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 16,
    flex: 1,
  },
  logoutText: {
    color: '#F44336',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
});

export default ProfileScreen;