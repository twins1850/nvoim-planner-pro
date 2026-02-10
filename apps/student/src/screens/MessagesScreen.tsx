import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  created_at: string;
  read_at?: string;
  is_sender: boolean;
}

interface Teacher {
  id: string;
  full_name: string;
  avatar_url?: string;
  is_online: boolean;
}

const MessagesScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);
  
  // 네트워크 연결 상태 관리
  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeMessages();
    
    // 네트워크 연결 상태 모니터링 시작
    const connectionMonitorInterval = setInterval(checkConnection, 30000); // 30초마다 연결 체크
    
    // 온라인/오프라인 상태 감지
    const handleOnline = () => {
      console.log('네트워크 연결됨');
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      if (!realtimeSubscription && conversationId) {
        handleReconnect();
      }
    };

    const handleOffline = () => {
      console.log('네트워크 연결 끊김');
      setIsConnected(false);
      setConnectionError('네트워크 연결이 끊어졌습니다.');
    };

    // React Native에서는 NetInfo를 사용해야 하지만, 여기서는 기본적인 처리만
    
    // Cleanup function
    return () => {
      if (realtimeSubscription) {
        console.log('실시간 구독 정리');
        realtimeSubscription.unsubscribe();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      clearInterval(connectionMonitorInterval);
    };
  }, [realtimeSubscription, conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeMessages = async () => {
    try {
      setLoading(true);
      
      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '사용자 인증이 필요합니다.');
        return;
      }

      // 학생 정보 가져오기
      console.log('Fetching student data for user:', user.id);
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select(`
          id,
          planner_id
        `)
        .eq('id', user.id)
        .maybeSingle();

      console.log('Student data query result:', { studentData, studentError });

      if (studentError) {
        console.error('Error fetching student data:', studentError);
        Alert.alert('오류', '학생 정보를 가져오는 중 오류가 발생했습니다.');
        return;
      }

      if (!studentData || !studentData.planner_id) {
        console.log('No connected planner found for user:', user.id);
        Alert.alert('알림', '선생님과 연결이 필요합니다. 프로필에서 초대 코드를 입력해주세요.');
        return;
      }

      const student = studentData;

      // 플래너 정보 가져오기
      const { data: teacherData, error: teacherError } = await supabase
        .from('planner_profiles')
        .select('id')
        .eq('id', student.planner_id)
        .maybeSingle();

      // profiles 테이블에서 플래너 이름 가져오기
      const { data: plannerProfileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', student.planner_id)
        .maybeSingle();

      if (teacherError) {
        console.error('Error fetching planner data:', teacherError);
      }

      let teacher;
      if (!plannerProfileData) {
        console.log('No planner profile found for planner_id:', student.planner_id);
        // 플래너 프로필이 없는 경우 기본값 사용
        teacher = {
          id: student.planner_id,
          full_name: '플래너',
          avatar_url: null
        };
      } else {
        teacher = {
          id: plannerProfileData.id,
          full_name: plannerProfileData.full_name || '플래너',
          avatar_url: null
        };
      }

      // 플래너 정보 설정
      const teacherInfo: Teacher = {
        id: student.planner_id,
        full_name: teacher.full_name || '플래너',
        avatar_url: teacher.avatar_url,
        is_online: false // 실시간 상태는 추후 구현
      };

      setTeacher(teacherInfo);

      // 대화방 찾기 또는 생성
      let { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('teacher_id', student.planner_id)
        .eq('student_id', user.id)
        .maybeSingle();

      let conversation = null;

      if (conversationError) {
        console.error('Error fetching conversation:', conversationError);
        Alert.alert('오류', '대화방 정보를 가져오는 중 오류가 발생했습니다.');
        return;
      }

      if (!conversationData) {
        // 대화방이 없으면 생성
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            teacher_id: student.planner_id,
            student_id: user.id
          })
          .select('id')
          .maybeSingle();

        if (createError) {
          console.error('Error creating conversation:', createError);
          Alert.alert('오류', '대화방을 생성할 수 없습니다.');
          return;
        }

        if (newConversation) {
          conversation = newConversation;
        } else {
          Alert.alert('오류', '대화방을 생성할 수 없습니다.');
          return;
        }
      } else {
        conversation = conversationData;
      }

      setConversationId(conversation.id);

      // 메시지 가져오기
      await fetchMessages(conversation.id, user.id);

      // 읽지 않은 메시지 읽음 처리
      await markMessagesAsRead(conversation.id, user.id);

      // 실시간 메시지 구독 시작
      const subscription = setupRealtimeSubscription(conversation.id, user.id);
      setRealtimeSubscription(subscription);

    } catch (error) {
      console.error('Error initializing messages:', error);
      Alert.alert('오류', '메시지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string, userId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          content,
          message_type,
          created_at,
          read_at
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages: Message[] = messagesData?.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type,
        created_at: msg.created_at,
        read_at: msg.read_at,
        is_sender: msg.sender_id === userId
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (convId: string, userId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .neq('sender_id', userId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !teacher || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    const tempId = Date.now().toString(); // 임시 ID

    try {
      setNewMessage(''); // 먼저 입력 필드 클리어

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('사용자 인증 오류');
      }

      // UI에 임시 메시지 추가 (즉시 반응)
      const tempMsg: Message = {
        id: tempId,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
        read_at: null,
        is_sender: true
      };

      setMessages(prev => [...prev, tempMsg]);

      // 데이터베이스에 메시지 저장
      const { data: newMessageData, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        
        // 임시 메시지 제거
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setNewMessage(messageContent); // 메시지 복원
        
        if (!isConnected) {
          Alert.alert('연결 오류', '네트워크 연결을 확인해주세요.');
        } else {
          Alert.alert('오류', '메시지를 전송할 수 없습니다.');
        }
        return;
      }

      // 임시 메시지를 실제 메시지로 교체
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? {
                id: newMessageData.id,
                sender_id: newMessageData.sender_id,
                content: newMessageData.content,
                message_type: newMessageData.message_type,
                created_at: newMessageData.created_at,
                read_at: newMessageData.read_at,
                is_sender: true
              }
            : msg
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
      
      // 임시 메시지 제거
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageContent); // 메시지 복원
      
      if (!isConnected) {
        setConnectionError('메시지 전송 실패: 네트워크 연결을 확인해주세요.');
      } else {
        Alert.alert('오류', '메시지를 전송하는 중 오류가 발생했습니다.');
      }
    } finally {
      setSending(false);
    }
  };

  // 네트워크 연결 체크 함수
  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('사용자 인증 오류');
      }
      
      // 간단한 연결 테스트
      await supabase.from('conversations').select('id').limit(1);
      
      if (!isConnected) {
        setIsConnected(true);
        setConnectionError(null);
        setRetryCount(0);
        console.log('연결 복구됨');
      }
    } catch (error) {
      if (isConnected) {
        setIsConnected(false);
        setConnectionError('연결 상태를 확인하는 중...');
        handleReconnect();
      }
    }
  };

  // 재연결 처리 함수
  const handleReconnect = async () => {
    if (retryCount >= 5) {
      setConnectionError('연결 재시도 횟수를 초과했습니다. 앱을 다시 시작해주세요.');
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프: 1초, 2초, 4초, 8초, 16초

    console.log(`재연결 시도 ${retryCount + 1}/5 (${delay}ms 후)`);

    retryTimeoutRef.current = setTimeout(async () => {
      try {
        setRetryCount(prev => prev + 1);
        
        // 실시간 구독 재시작
        if (conversationId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (realtimeSubscription) {
              realtimeSubscription.unsubscribe();
            }
            
            const newSubscription = setupRealtimeSubscription(conversationId, user.id);
            setRealtimeSubscription(newSubscription);
            
            setIsConnected(true);
            setConnectionError(null);
            setRetryCount(0);
            setIsRetrying(false);
            
            console.log('재연결 성공');
          }
        }
      } catch (error) {
        console.error('재연결 실패:', error);
        setIsRetrying(false);
        if (retryCount < 4) {
          handleReconnect(); // 다음 재시도
        }
      }
    }, delay);
  };

  const setupRealtimeSubscription = (convId: string, userId: string) => {
    // 실시간 메시지 구독
    const subscription = supabase
      .channel('student_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload) => {
          console.log('새 메시지 수신:', payload);
          
          // 새 메시지를 UI에 추가 (자신이 보낸 메시지가 아닌 경우만)
          if (payload.new.sender_id !== userId) {
            const newMsg: Message = {
              id: payload.new.id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              message_type: payload.new.message_type || 'text',
              created_at: payload.new.created_at,
              read_at: payload.new.read_at,
              is_sender: false
            };

            setMessages(prev => [...prev, newMsg]);

            try {
              // 자동으로 읽음 처리
              const readTime = new Date().toISOString();
              await supabase
                .from('messages')
                .update({ read_at: readTime })
                .eq('id', payload.new.id);
              
              // UI에서도 읽음 상태 업데이트
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === payload.new.id 
                    ? { ...msg, read_at: readTime }
                    : msg
                )
              );
            } catch (error) {
              console.error('읽음 처리 오류:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload) => {
          console.log('메시지 읽음 상태 업데이트:', payload);
          
          // 내가 보낸 메시지의 읽음 상태가 업데이트된 경우
          if (payload.new.sender_id === userId && payload.new.read_at && !payload.old.read_at) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === payload.new.id 
                  ? { ...msg, read_at: payload.new.read_at }
                  : msg
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('실시간 구독 상태 변경:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
          setRetryCount(0);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('실시간 연결에 문제가 발생했습니다.');
          handleReconnect();
        }
      });

    console.log('실시간 메시지 구독 시작:', convId);
    return subscription;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return '방금 전';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const showTime = index === 0 || 
      new Date(item.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000;
    
    return (
      <View>
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          item.is_sender ? styles.senderMessageContainer : styles.receiverMessageContainer
        ]}>
          <View style={[
            styles.messageBubble,
            item.is_sender ? styles.senderMessageBubble : styles.receiverMessageBubble
          ]}>
            <Text style={[
              styles.messageText,
              item.is_sender ? styles.senderMessageText : styles.receiverMessageText
            ]}>
              {item.content}
            </Text>
          </View>
          
          <View style={styles.messageFooter}>
            <Text style={styles.messageTimeSmall}>
              {formatMessageTime(item.created_at)}
            </Text>
            {item.is_sender && (
              <View style={styles.messageStatus}>
                {item.read_at ? (
                  <Ionicons name="checkmark-done" size={14} color="#4CAF50" />
                ) : (
                  <Ionicons name="checkmark" size={14} color="#9E9E9E" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
        <Text style={styles.loadingText}>메시지를 불러오는 중...</Text>
      </View>
    );
  }

  if (!teacher) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-remove-outline" size={64} color="#BDBDBD" />
        <Text style={styles.errorTitle}>연결된 선생님이 없습니다</Text>
        <Text style={styles.errorDescription}>
          선생님과 연결 후 메시지를 주고받을 수 있습니다.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {teacher.full_name.charAt(0)}
                </Text>
              </View>
              {isConnected && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{teacher.full_name}</Text>
              <Text style={styles.headerStatus}>
                {isConnected ? '연결됨' : (isRetrying ? '재연결 중...' : '연결 끊김')}
              </Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="call-outline" size={20} color="#757575" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="videocam-outline" size={20} color="#757575" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 연결 상태 알림 */}
        {connectionError && (
          <View style={[
            styles.connectionAlert, 
            isRetrying ? styles.connectionAlertWarning : styles.connectionAlertError
          ]}>
            <Ionicons 
              name={isRetrying ? "refresh-circle" : "alert-circle"} 
              size={16} 
              color={isRetrying ? "#FF9800" : "#F44336"} 
            />
            <Text style={[
              styles.connectionAlertText,
              isRetrying ? styles.connectionAlertTextWarning : styles.connectionAlertTextError
            ]}>
              {connectionError}
            </Text>
            {isRetrying && <ActivityIndicator size="small" color="#FF9800" style={{ marginLeft: 8 }} />}
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach-outline" size={20} color="#757575" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#9E9E9E"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.disabledSendButton]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F6CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  headerStatus: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  timeContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#757575',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 8,
    maxWidth: '75%',
  },
  senderMessageContainer: {
    alignSelf: 'flex-end',
  },
  receiverMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  senderMessageBubble: {
    backgroundColor: '#4F6CFF',
    borderBottomRightRadius: 4,
  },
  receiverMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  senderMessageText: {
    color: '#FFFFFF',
  },
  receiverMessageText: {
    color: '#212121',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTimeSmall: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  messageStatus: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#212121',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F6CFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#BDBDBD',
  },
  // 연결 상태 알림 스타일
  connectionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  connectionAlertError: {
    backgroundColor: '#FFEBEE',
  },
  connectionAlertWarning: {
    backgroundColor: '#FFF8E1',
  },
  connectionAlertText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  connectionAlertTextError: {
    color: '#F44336',
  },
  connectionAlertTextWarning: {
    color: '#FF9800',
  },
});

export default MessagesScreen;