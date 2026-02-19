import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// 타입
import { AuthStackParamList } from '../navigation/types';

// API
import { authAPI } from '../services/supabaseApi';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // 입력 검증
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 테스트 계정 자동 입력 (개발 편의를 위한 기능)
      const loginEmail = email.trim() || 'student@example.com';
      const loginPassword = password.trim() || 'password123';
      
      try {
        // 온라인 로그인 시도
        const response = await authAPI.login(loginEmail, loginPassword);
        
        if (response.success) {
          // 토큰 저장
          await AsyncStorage.setItem('token', response.data.token);
          await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
          
          // 사용자 정보 저장
          await AsyncStorage.setItem('userInfo', JSON.stringify(response.data.user));
          
          // 로그인 성공 알림
          Alert.alert('로그인 성공', '환영합니다!', [
            { text: '확인', onPress: async () => {
              // 인증 상태 설정
              await AsyncStorage.setItem('isAuthenticated', 'true');
              
              // 앱 재시작 (메인 화면으로 이동)
              // 네비게이션 대신 앱 재시작을 위해 인증 상태만 변경
              // RootNavigator에서 인증 상태를 감지하여 화면을 전환함
              setLoading(false);
              
              // 앱 재시작을 위해 페이지 새로고침
              if (Platform.OS === 'web') {
                window.location.reload();
              } else {
                // 네이티브 앱에서는 인증 상태 변경 후 앱이 자동으로 감지하도록 함
                Alert.alert(
                  '로그인 완료',
                  '앱을 다시 시작해주세요.',
                  [{ text: '확인' }]
                );
              }
            }}
          ]);
        } else {
          setError((response as any).error?.message || '로그인에 실패했습니다.');
        }
      } catch (apiError: any) {
        console.error('API Login error:', apiError);
        
        setError(apiError.response?.data?.error?.message || apiError.message || '로그인 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>영어 회화 학습</Text>
          <Text style={styles.subLogoText}>학생용 앱</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor="#9E9E9E"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#9E9E9E"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#757575"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>
          

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.testAccountContainer}>
          <Text style={styles.testAccountTitle}>테스트 계정</Text>
          <Text style={styles.testAccountText}>이메일: student@example.com</Text>
          <Text style={styles.testAccountText}>비밀번호: password123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4F6CFF',
    marginBottom: 8,
  },
  subLogoText: {
    fontSize: 18,
    color: '#757575',
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#212121',
  },
  passwordToggle: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4F6CFF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#4F6CFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    color: '#757575',
    fontSize: 14,
    marginRight: 4,
  },
  registerLink: {
    color: '#4F6CFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testAccountContainer: {
    marginTop: 48,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  testAccountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  testAccountText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
});

export default LoginScreen;