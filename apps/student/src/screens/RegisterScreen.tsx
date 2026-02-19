import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// 타입
import { AuthStackParamList } from '../navigation/types';

// API
import { authAPI } from '../services/supabaseApi';
import { supabase } from '../lib/supabase';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<'available' | 'taken' | null>(null);

  // 이메일 중복확인
  const checkEmailAvailability = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setEmailCheckLoading(true);
    setError('');
    
    try {
      // Supabase에서 이메일 중복 확인
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.trim())
        .limit(1);

      if (error) {
        console.error('Email check error:', error);
        setError('이메일 확인 중 오류가 발생했습니다.');
        setEmailCheckResult(null);
        return;
      }

      if (data && data.length > 0) {
        setEmailCheckResult('taken');
        setError('이미 사용 중인 이메일입니다.');
      } else {
        setEmailCheckResult('available');
        setError('');
        Alert.alert('확인', '사용 가능한 이메일입니다!');
      }
    } catch (error) {
      console.error('Email check error:', error);
      setError('이메일 확인 중 오류가 발생했습니다.');
      setEmailCheckResult(null);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  // 이메일 변경 시 중복확인 결과 초기화
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailCheckResult(null);
    setError('');
  };

  const handleRegister = async () => {
    // 입력 검증
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 이메일 중복확인 완료 여부 검증
    if (emailCheckResult !== 'available') {
      setError('이메일 중복확인을 완료해주세요.');
      return;
    }

    if (!phone.trim()) {
      setError('전화번호를 입력해주세요.');
      return;
    }

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!agreeToPrivacy) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const userData = {
        email,
        password,
        full_name: name,  // authAPI.register expects full_name
        phone,
      };

      const response = await authAPI.register(userData);
      
      if (response.success) {
        Alert.alert(
          '회원가입 성공',
          '회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.',
          [
            { text: '확인', onPress: () => navigation.navigate('Login') }
          ]
        );
      } else {
        setError((response as any).error?.message || '회원가입에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      // Supabase AuthApiError 처리
      if (error.message) {
        if (error.message === 'User already registered') {
          setError('이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.');
        } else {
          setError(error.message);
        }
      } else {
        setError('회원가입 중 오류가 발생했습니다.');
      }
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>회원가입</Text>
          <Text style={styles.subHeaderText}>영어 회화 학습 앱에 오신 것을 환영합니다.</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="이름"
              placeholderTextColor="#9E9E9E"
              value={name}
              onChangeText={setName}
              testID="register-name-input"
            />
          </View>

          <View style={styles.emailContainer}>
            <View style={[
              styles.inputContainer,
              styles.emailInputContainer,
              emailCheckResult === 'available' ? styles.inputSuccess :
              emailCheckResult === 'taken' ? styles.inputError : null
            ]}>
              <Ionicons name="mail-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput
                style={styles.emailInput}
                placeholder="이메일"
                placeholderTextColor="#9E9E9E"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={handleEmailChange}
                testID="register-email-input"
              />
              {emailCheckResult === 'available' && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.statusIcon} />
              )}
              {emailCheckResult === 'taken' && (
                <Ionicons name="close-circle" size={20} color="#F44336" style={styles.statusIcon} />
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.checkButton,
                emailCheckLoading ? styles.checkButtonLoading : null
              ]}
              onPress={checkEmailAvailability}
              disabled={emailCheckLoading || !email.trim()}
            >
              {emailCheckLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.checkButtonText}>중복확인</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="전화번호 (예: 010-1234-5678)"
              placeholderTextColor="#9E9E9E"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              testID="register-phone-input"
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
              testID="register-password-input"
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

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              placeholderTextColor="#9E9E9E"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              testID="register-confirm-password-input"
            />
          </View>

          <TouchableOpacity
            style={styles.privacyContainer}
            onPress={() => setAgreeToPrivacy(!agreeToPrivacy)}
            testID="privacy-agreement-checkbox"
          >
            <View style={[styles.checkbox, agreeToPrivacy && styles.checkboxChecked]}>
              {agreeToPrivacy && (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.privacyText}>
              개인정보 수집 및 이용에 동의합니다.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>회원가입</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>로그인</Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
  },
  backButton: {
    marginBottom: 24,
  },
  headerContainer: {
    marginBottom: 32,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
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
  registerButton: {
    backgroundColor: '#4F6CFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#757575',
    fontSize: 14,
    marginRight: 4,
  },
  loginLink: {
    color: '#4F6CFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // 이메일 중복확인 관련 스타일
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emailInputContainer: {
    flex: 1,
    marginBottom: 8,
    marginRight: 8,
  },
  emailInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#212121',
  },
  statusIcon: {
    marginLeft: 8,
  },
  inputSuccess: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 1,
  },
  checkButton: {
    backgroundColor: '#4F6CFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    height: 48,
  },
  checkButtonLoading: {
    backgroundColor: '#9E9E9E',
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4F6CFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F6CFF',
  },
  privacyText: {
    flex: 1,
    color: '#212121',
    fontSize: 14,
  },
});

export default RegisterScreen;