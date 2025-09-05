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

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // 입력 검증
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 실제 API 연동 시 구현
      // const response = await authAPI.resetPassword(email);
      
      // 임시 구현 (성공 가정)
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
        
        Alert.alert(
          '비밀번호 재설정 이메일 발송',
          '입력하신 이메일로 비밀번호 재설정 링크가 발송되었습니다. 이메일을 확인해주세요.',
          [
            { text: '확인', onPress: () => navigation.navigate('Login') }
          ]
        );
      }, 1500);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.');
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
          <Text style={styles.headerText}>비밀번호 찾기</Text>
          <Text style={styles.subHeaderText}>
            가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.
              </Text>
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
              editable={!success}
            />
          </View>

          <TouchableOpacity
            style={[styles.resetButton, success && styles.disabledButton]}
            onPress={handleResetPassword}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.resetButtonText}>비밀번호 재설정 링크 받기</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>로그인 화면으로 돌아가기</Text>
          </TouchableOpacity>
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
    lineHeight: 22,
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
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#2E7D32',
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
  resetButton: {
    backgroundColor: '#4F6CFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignSelf: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    color: '#4F6CFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;