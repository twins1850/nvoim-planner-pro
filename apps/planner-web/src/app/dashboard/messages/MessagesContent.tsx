"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info,
  Smile,
  Image,
  File,
  Download,
  Check,
  CheckCheck,
  Clock,
  Circle
} from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  read_at?: string;
  is_sender: boolean;
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online: boolean;
  status: 'active' | 'archived';
  type: 'student' | 'parent';
}

export default function MessagesContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeSubscription = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    fetchConversations();
    setupNetworkMonitoring();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // 온라인/오프라인 상태 감지
    const handleOnline = () => {
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      console.log('네트워크 연결됨');
    };

    const handleOffline = () => {
      setIsConnected(false);
      setConnectionError('네트워크 연결이 끊어졌습니다');
      console.log('네트워크 연결 끊김');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.participant_id);
      // Mark messages as read
      markMessagesAsRead(selectedConversation.participant_id);
      // Setup realtime subscription
      const subscription = setupRealtimeSubscription(selectedConversation.participant_id);
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 실제 연결된 학생들의 대화 목록을 가져오기
      const { data: students, error: studentsError } = await supabase
        .from('student_profiles')
        .select(`
          id,
          full_name,
          planner_id
        `)
        .eq('planner_id', user.id);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return;
      }

      // 각 학생과의 대화 정보 가져오기
      const conversationPromises = students?.map(async (student) => {
        // 해당 학생과의 대화방 찾기 또는 생성
        let { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .select('id, last_message_time')
          .eq('teacher_id', user.id)
          .eq('student_id', student.id)
          .single();

        if (conversationError && conversationError.code === 'PGRST116') {
          // 대화방이 없으면 생성
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
              teacher_id: user.id,
              student_id: student.id
            })
            .select('id, last_message_time')
            .single();

          if (createError) {
            console.error('Error creating conversation:', createError);
            return null;
          }
          conversation = newConversation;
        }

        if (!conversation) return null;

        // 마지막 메시지 가져오기
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // 읽지 않은 메시지 수 계산 (상대방이 보낸 메시지 중 읽지 않은 것)
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        return {
          id: conversation.id,
          participant_id: student.id,
          participant_name: student.full_name,
          participant_avatar: undefined, // 기본값으로 undefined 설정
          last_message: lastMessageData?.content || '대화를 시작해보세요!',
          last_message_time: lastMessageData?.created_at || conversation.last_message_time,
          unread_count: unreadCount || 0,
          is_online: false, // 실시간 상태는 추후 구현
          status: 'active' as const,
          type: 'student' as const
        };
      }) || [];

      const resolvedConversations = await Promise.all(conversationPromises);
      const validConversations = resolvedConversations.filter(Boolean) as Conversation[];
      
      // 마지막 메시지 시간순으로 정렬
      const sortedConversations = validConversations.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      setConversations(sortedConversations);
      
      // 첫 번째 대화 선택
      if (sortedConversations.length > 0) {
        setSelectedConversation(sortedConversations[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (participantId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 해당 참가자와의 대화방 찾기
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('student_id', participantId)
        .single();

      if (!conversation) {
        setMessages([]);
        return;
      }

      // 해당 대화방의 메시지들 가져오기
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
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // 메시지 데이터 변환
      const formattedMessages: Message[] = messagesData?.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: '', // 새 구조에서는 사용하지 않음
        content: msg.content,
        type: msg.message_type || 'text',
        file_url: undefined,
        file_name: undefined,
        file_size: undefined,
        created_at: msg.created_at,
        read_at: msg.read_at,
        is_sender: msg.sender_id === user.id
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setupRealtimeSubscription = (participantId: string) => {
    const supabase = createClient();
    
    // 실시간 메시지 구독
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('새 메시지 수신:', payload);
          
          // 현재 대화방과 관련된 메시지인지 확인
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('teacher_id', user.id)
            .eq('student_id', participantId)
            .single();

          if (!conversation || payload.new.conversation_id !== conversation.id) {
            return;
          }

          // 새 메시지를 UI에 추가
          const newMsg: Message = {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            receiver_id: '',
            content: payload.new.content,
            type: payload.new.message_type || 'text',
            file_url: undefined,
            file_name: undefined,
            file_size: undefined,
            created_at: payload.new.created_at,
            read_at: payload.new.read_at,
            is_sender: payload.new.sender_id === user.id
          };

          setMessages(prev => [...prev, newMsg]);

          // 상대방이 보낸 메시지면 자동으로 읽음 처리 (현재 대화방을 보고 있을 때만)
          if (payload.new.sender_id !== user.id) {
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
          }

          // 대화 목록 업데이트
          setConversations(prev => 
            prev.map(conv => 
              conv.participant_id === participantId
                ? { 
                    ...conv, 
                    last_message: payload.new.content,
                    last_message_time: payload.new.created_at,
                    unread_count: payload.new.sender_id !== user.id ? conv.unread_count + 1 : conv.unread_count
                  }
                : conv
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('메시지 읽음 상태 업데이트:', payload);
          
          // 현재 대화방과 관련된 메시지인지 확인
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('teacher_id', user.id)
            .eq('student_id', participantId)
            .single();

          if (!conversation || payload.new.conversation_id !== conversation.id) {
            return;
          }

          // 내가 보낸 메시지의 읽음 상태가 업데이트된 경우
          if (payload.new.sender_id === user.id && payload.new.read_at && !payload.old.read_at) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === payload.new.id 
                  ? { ...msg, read_at: payload.new.read_at }
                  : msg
              )
            );
          }
          
          // 상대방이 보낸 메시지를 읽은 경우 읽지 않은 카운트 감소
          if (payload.new.sender_id !== user.id && payload.new.read_at && !payload.old.read_at) {
            setConversations(prev => 
              prev.map(conv => 
                conv.participant_id === participantId
                  ? { ...conv, unread_count: Math.max(0, conv.unread_count - 1) }
                  : conv
              )
            );
          }
        }
      )
      .subscribe();

    console.log('실시간 메시지 구독 시작:', participantId);
    realtimeSubscription.current = subscription;
    return subscription;
  };

  const setupNetworkMonitoring = () => {
    // Supabase 연결 상태 모니터링
    const supabase = createClient();
    
    // 주기적으로 연결 상태 확인
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id')
          .limit(1);
        
        if (error) {
          throw error;
        }
        
        if (!isConnected) {
          setIsConnected(true);
          setConnectionError(null);
          setRetryCount(0);
          console.log('Supabase 연결 복구됨');
        }
      } catch (error) {
        console.error('Supabase 연결 오류:', error);
        setIsConnected(false);
        setConnectionError('서버 연결에 문제가 있습니다');
        handleReconnect();
      }
    };

    // 10초마다 연결 상태 확인
    const intervalId = setInterval(checkConnection, 10000);
    
    return () => clearInterval(intervalId);
  };

  const handleReconnect = async () => {
    if (retryCount >= 5) {
      setConnectionError('연결 재시도 횟수를 초과했습니다. 페이지를 새로고침해주세요.');
      return;
    }

    const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프
    setRetryCount(prev => prev + 1);
    
    console.log(`${delay}ms 후 재연결 시도 (${retryCount + 1}/5)`);
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Realtime 구독 재연결
          if (realtimeSubscription.current) {
            realtimeSubscription.current.unsubscribe();
          }
          
          if (selectedConversation) {
            const subscription = setupRealtimeSubscription(selectedConversation.participant_id);
            realtimeSubscription.current = subscription;
          }
          
          setIsConnected(true);
          setConnectionError(null);
          setRetryCount(0);
          console.log('재연결 성공');
        }
      } catch (error) {
        console.error('재연결 실패:', error);
        handleReconnect(); // 재귀적으로 재시도
      }
    }, delay);
  };

  const markMessagesAsRead = async (participantId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 해당 참가자와의 대화방 찾기
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('student_id', participantId)
        .single();

      if (!conversation) return;

      // 읽지 않은 메시지들을 읽음 처리 (상대방이 보낸 메시지만)
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversation.id)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // UI 업데이트
      setConversations(prev => 
        prev.map(conv => 
          conv.participant_id === participantId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const messageContent = newMessage.trim();
      setNewMessage('');

      // 해당 참가자와의 대화방 찾기
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('student_id', selectedConversation.participant_id)
        .single();

      if (!conversation) {
        console.error('Conversation not found');
        return;
      }

      console.log('📨 Attempting to send message:', {
        conversation_id: conversation.id,
        sender_id: user.id,
        participant_id: selectedConversation.participant_id,
        content_length: messageContent.length
      });

      // 데이터베이스에 메시지 저장
      const { data: newMessageData, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Conversation ID:', conversation.id);
        console.error('Sender ID:', user.id);
        console.error('Message content:', messageContent);
        return;
      }

      // UI에 새 메시지 추가
      const newMsg: Message = {
        id: newMessageData.id,
        sender_id: newMessageData.sender_id,
        receiver_id: '', // 새 구조에서는 사용하지 않음
        content: newMessageData.content,
        type: newMessageData.message_type || 'text',
        file_url: undefined,
        file_name: undefined,
        file_size: undefined,
        created_at: newMessageData.created_at,
        read_at: newMessageData.read_at,
        is_sender: true
      };

      setMessages(prev => [...prev, newMsg]);

      // 대화 목록 업데이트
      setConversations(prev => 
        prev.map(conv => 
          conv.participant_id === selectedConversation.participant_id
            ? { 
                ...conv, 
                last_message: messageContent,
                last_message_time: new Date().toISOString()
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    // 파일 업로드 로직 구현
    console.log('File selected:', file.name);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">메시지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 m-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-3xl font-bold text-gray-900">메시지</h1>
        <p className="text-gray-600 mt-2">학생들과 실시간으로 소통하세요</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="대화 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {conversation.participant_name.charAt(0)}
                    </div>
                    {conversation.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.participant_name}
                        {conversation.type === 'parent' && (
                          <span className="text-xs text-blue-600 ml-1">(학부모)</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1">
                        {conversation.unread_count > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-5 text-center">
                            {conversation.unread_count}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.last_message_time)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.last_message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredConversations.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedConversation.participant_name.charAt(0)}
                    </div>
                    {selectedConversation.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-900">
                      {selectedConversation.participant_name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.is_online ? '온라인' : '오프라인'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                    <Info className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages
                  // 중복 메시지 제거 (같은 ID가 여러 번 있는 경우)
                  .filter((message, index, array) => 
                    array.findIndex(m => m.id === message.id) === index
                  )
                  .map((message, index, filteredArray) => {
                    const showTime = index === 0 || 
                      new Date(message.created_at).getTime() - new Date(filteredArray[index - 1].created_at).getTime() > 5 * 60 * 1000;
                    
                    return (
                      <div key={`${message.id}-${index}`}>
                      {showTime && (
                        <div className="flex justify-center mb-4">
                          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex ${message.is_sender ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.is_sender 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-900 border'
                        }`}>
                          <p className="break-words">{message.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            message.is_sender ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            <span className="text-xs">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {message.is_sender && (
                              <div className="flex">
                                {message.read_at ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="메시지를 입력하세요..."
                      className="w-full py-3 px-4 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className={`p-3 rounded-full transition-colors ${
                      newMessage.trim() && !sending
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">대화를 선택하세요</h3>
                <p>왼쪽에서 대화를 선택하여 메시지를 확인하고 답장하세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}