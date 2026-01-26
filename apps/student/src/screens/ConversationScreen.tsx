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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 타입
import { RootStackParamList } from '../navigation/types';

// 유틸리티
import { isConnected, addToOfflineQueue } from '../utils/offlineStorage';

type ConversationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

const ConversationScreen = () => {
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkNetworkStatus();
    loadMessages();
    
    // 화면 포커스 시 메시지 새로고침
    const unsubscribe = navigation.addListener('focus', () => {
      loadMessages();
    });
    
    return unsubscribe;
  }, [navigation]);

  const checkNetworkStatus = async () => {
    const connected = await isConnected();
    setIsOfflineMode(!connected);
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      // 로컬 저장소에서 메시지 불러오기
      const savedMessages = await AsyncStorage.getItem('conversation_messages');
      if (savedMessages && savedMessages !== 'undefined' && savedMessages !== 'null') {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } else {
        // 초기 시스템 메시지
        const initialMessage: Message = {
          id: `system-${Date.now()}`,
          text: '안녕하세요! 영어 대화 연습을 시작해볼까요? 간단한 인사로 시작해보세요.',
          sender: 'system',
          timestamp: new Date()
        };
        setMessages([initialMessage]);
        await AsyncStorage.setItem('conversation_messages', JSON.stringify([initialMessage]));
      }
    } catch (error) {
      console.error('Failed to load messages', error);
      Alert.alert('오류', '메시지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveMessages = async (updatedMessages: Message[]) => {
    try {
      await AsyncStorage.setItem('conversation_messages', JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to save messages', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    setSending(true);
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInputText('');
    
    // 리스트 스크롤
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const connected = await isConnected();
      
      if (connected && !isOfflineMode) {
        // 온라인 모드: API 호출
        try {
          // API 호출 (실제 구현 시 적절한 엔드포인트로 변경)
          const response = await fetch('http://192.168.123.175:3001/api/conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
            },
            body: JSON.stringify({ message: inputText.trim() })
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          // 시스템 응답 추가
          const systemMessage: Message = {
            id: `system-${Date.now()}`,
            text: data.response || '죄송합니다, 응답을 생성할 수 없습니다.',
            sender: 'system',
            timestamp: new Date()
          };
          
          // 사용자 메시지 상태 업데이트 및 시스템 메시지 추가
          const finalMessages = updatedMessages.map(msg => 
            msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
          );
          finalMessages.push(systemMessage);
          
          setMessages(finalMessages);
          saveMessages(finalMessages);
          
          // 리스트 스크롤
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // 오류 발생 시 오프라인 큐에 추가
          await addToOfflineQueue(
            '/conversation',
            'POST',
            { message: inputText.trim() }
          );
          
          // 사용자 메시지 상태 업데이트
          const errorMessages = updatedMessages.map(msg => 
            msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
          );
          
          // 오류 메시지 추가
          const errorSystemMessage: Message = {
            id: `system-${Date.now()}`,
            text: '메시지 전송 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.',
            sender: 'system',
            timestamp: new Date()
          };
          errorMessages.push(errorSystemMessage);
          
          setMessages(errorMessages);
          saveMessages(errorMessages);
          
          // 리스트 스크롤
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } else {
        // 오프라인 모드: 로컬 처리
        await addToOfflineQueue(
          '/conversation',
          'POST',
          { message: inputText.trim() }
        );
        
        // 사용자 메시지 상태 업데이트
        const offlineMessages = updatedMessages.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        );
        
        // 오프라인 응답 메시지 추가
        const offlineSystemMessage: Message = {
          id: `system-${Date.now()}`,
          text: '현재 오프라인 모드입니다. 인터넷 연결 시 응답을 받을 수 있습니다.',
          sender: 'system',
          timestamp: new Date()
        };
        offlineMessages.push(offlineSystemMessage);
        
        setMessages(offlineMessages);
        saveMessages(offlineMessages);
        
        // 리스트 스크롤
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send message', error);
      
      // 오류 발생 시 메시지 상태 업데이트
      const errorMessages = updatedMessages.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
      );
      
      setMessages(errorMessages);
      saveMessages(errorMessages);
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (messageId: string) => {
    const messageToRetry = messages.find(msg => msg.id === messageId);
    if (!messageToRetry) return;
    
    // 메시지 상태 업데이트
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, status: 'sending' } : msg
    );
    
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    
    try {
      const connected = await isConnected();
      
      if (connected) {
        // API 호출 (실제 구현 시 적절한 엔드포인트로 변경)
        const response = await fetch('http://192.168.123.175:3001/api/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
          },
          body: JSON.stringify({ message: messageToRetry.text })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 시스템 응답 추가
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          text: data.response || '죄송합니다, 응답을 생성할 수 없습니다.',
          sender: 'system',
          timestamp: new Date()
        };
        
        // 메시지 상태 업데이트 및 시스템 메시지 추가
        const finalMessages = updatedMessages.map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        );
        
        // 이전 오류 메시지 제거
        const filteredMessages = finalMessages.filter(msg => 
          !(msg.sender === 'system' && msg.text.includes('오류가 발생했습니다'))
        );
        
        filteredMessages.push(systemMessage);
        
        setMessages(filteredMessages);
        saveMessages(filteredMessages);
        
        // 리스트 스크롤
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // 오프라인 모드
        await addToOfflineQueue(
          '/conversation',
          'POST',
          { message: messageToRetry.text }
        );
        
        // 메시지 상태 업데이트
        const offlineMessages = updatedMessages.map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        );
        
        setMessages(offlineMessages);
        saveMessages(offlineMessages);
        
        Alert.alert(
          '오프라인 모드',
          '메시지가 오프라인 큐에 저장되었습니다. 인터넷 연결 시 자동으로 전송됩니다.'
        );
      }
    } catch (error) {
      console.error('Failed to retry message', error);
      
      // 오류 발생 시 메시지 상태 업데이트
      const errorMessages = updatedMessages.map(msg => 
        msg.id === messageId ? { ...msg, status: 'error' } : msg
      );
      
      setMessages(errorMessages);
      saveMessages(errorMessages);
    }
  };

  const clearConversation = () => {
    Alert.alert(
      '대화 초기화',
      '모든 대화 내용이 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '초기화', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 초기 시스템 메시지
              const initialMessage: Message = {
                id: `system-${Date.now()}`,
                text: '안녕하세요! 영어 대화 연습을 시작해볼까요? 간단한 인사로 시작해보세요.',
                sender: 'system',
                timestamp: new Date()
              };
              
              setMessages([initialMessage]);
              await AsyncStorage.setItem('conversation_messages', JSON.stringify([initialMessage]));
            } catch (error) {
              console.error('Failed to clear conversation', error);
              Alert.alert('오류', '대화 초기화 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessageContainer : styles.systemMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userMessageBubble : styles.systemMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userMessageText : styles.systemMessageText
        ]}>
          {item.text}
        </Text>
      </View>
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>
          {formatTime(new Date(item.timestamp))}
        </Text>
        
        {item.sender === 'user' && item.status && (
          <View style={styles.messageStatus}>
            {item.status === 'sending' && (
              <ActivityIndicator size="small" color="#BDBDBD" />
            )}
            
            {item.status === 'sent' && (
              <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
            )}
            
            {item.status === 'error' && (
              <TouchableOpacity onPress={() => retryMessage(item.id)}>
                <Ionicons name="refresh" size={16} color="#F44336" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>영어 대화 연습</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearConversation}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
      
      {isOfflineMode && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>오프라인 모드</Text>
        </View>
      )}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor="#9E9E9E"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.disabledButton]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  clearButton: {
    padding: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    padding: 12,
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  systemMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 4,
  },
  userMessageBubble: {
    backgroundColor: '#4F6CFF',
    borderBottomRightRadius: 4,
  },
  systemMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  systemMessageText: {
    color: '#212121',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    color: '#9E9E9E',
    marginRight: 4,
  },
  messageStatus: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#212121',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F6CFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
});

export default ConversationScreen;