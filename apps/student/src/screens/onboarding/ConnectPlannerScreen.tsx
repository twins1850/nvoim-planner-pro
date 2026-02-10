import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConnectPlannerScreenProps {
  onConnected?: () => void;
}

export default function ConnectPlannerScreen({ onConnected }: ConnectPlannerScreenProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const handleConnect = async () => {
    // 초대 코드 유효성 검사
    if (!inviteCode.trim()) {
      console.error('초대 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('로그인이 필요합니다.');
        setLoading(false);
        return;
      }

      // 먼저 student_profile이 존재하는지 확인하고 없으면 생성
      const { error: profileError } = await supabase.rpc('ensure_student_profile');
      if (profileError) {
        console.error('프로필 생성 실패:', profileError);
      }

      // student_profile에서 사용자 정보 가져오기 (maybeSingle로 변경)
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('full_name, phone, email')
        .eq('id', user.id)
        .maybeSingle();

      // 프로필 정보 또는 auth 메타데이터에서 정보 가져오기
      const studentName = profile?.full_name || user.user_metadata?.full_name || '';
      const studentPhone = profile?.phone || user.user_metadata?.phone || '';
      const studentEmail = profile?.email || user.email || '';

      // 학생 정보와 함께 플래너 연결
      const { data, error } = await supabase.rpc('connect_student_with_info', {
        invite_code_input: inviteCode.trim(),
        student_name: studentName,
        student_phone: studentPhone,
        student_email: studentEmail
      });

      console.log('RPC 응답:', { data, error });
      console.log('data 내용:', JSON.stringify(data, null, 2));

      if (error) throw error;

      if (data && data.success) {
        console.log('성공! 플래너 연결 및 학생 정보 등록 완료');
        // onConnected 콜백을 호출하여 RootNavigator에게 연결 상태 업데이트
        if (onConnected) {
          onConnected();
        }
        console.log('플래너와 성공적으로 연결되었습니다!');
      } else {
        console.log('실패! 오류:', data?.message);
        console.error('연결 실패:', data?.message || '연결에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      console.error('오류:', error.message || '연결 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>플래너와 연결하기</Text>
        <Text style={styles.subtitle}>
          플래너에게 받은 초대 코드를 입력해주세요.
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>플래너 초대 코드</Text>
            <TextInput
              style={styles.input}
              placeholder="AB12CD"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              testID="connect-invite-code-input"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>플래너와 연결하기</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={() => navigation.replace('MainTab')}
        >
          <Text style={styles.skipButtonText}>나중에 연결하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
