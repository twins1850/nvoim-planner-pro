import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// 스크린 임포트
import HomeScreen from '../screens/HomeScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import ProgressScreen from '../screens/ProgressScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// 타입 임포트
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);

  useEffect(() => {
    fetchUnreadCount();

    // 실시간 업데이트 구독
    const subscription = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    // 페이지가 포커스될 때마다 새로고침
    const interval = setInterval(fetchUnreadCount, 30000); // 30초마다

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      console.log('📬 fetchUnreadCount 시작');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ 사용자 없음');
        return;
      }
      console.log('✅ 사용자:', user.id);

      // 학생의 대화방 찾기
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', user.id)
        .single();

      if (convError) {
        console.log('❌ 대화방 조회 에러:', convError);
      }

      if (!conversation) {
        console.log('❌ 대화방 없음');
        setUnreadMessageCount(0);
        return;
      }
      console.log('✅ 대화방:', conversation.id);

      // 읽지 않은 메시지 수 조회 (선생님이 보낸 메시지만)
      const { data: unreadMessages, error: msgError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (msgError) {
        console.log('❌ 메시지 조회 에러:', msgError);
      }

      const count = (unreadMessages as any)?.count || 0;
      console.log('📊 읽지 않은 메시지 개수:', count);
      setUnreadMessageCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Homework') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Feedback') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F6CFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: '홈' }}
      />
      <Tab.Screen 
        name="Homework" 
        component={HomeworkScreen} 
        options={{ title: '숙제' }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ title: '진도' }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: '메시지',
          tabBarBadge: unreadMessageCount > 0 ? unreadMessageCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', color: 'white' }
        }}
      />
      <Tab.Screen 
        name="Feedback" 
        component={FeedbackScreen} 
        options={{ title: '피드백' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: '프로필' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;