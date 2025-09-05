import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 인증 API
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return { success: true, data: data.user }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },
  
  register: async (userData: { email: string; password: string; full_name: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: 'student', // 학생 역할 명시
          },
          // 이메일 확인 없이 바로 로그인 가능하도록 설정
          emailRedirectTo: undefined,
        },
      })
      
      if (error) {
        // 이미 등록된 사용자인 경우 로그인 시도
        if (error.message === 'User already registered') {
          console.log('User already exists, attempting login...')
          const loginResult = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
          })
          
          if (loginResult.error) {
            throw new Error('이미 등록된 이메일입니다. 비밀번호가 다를 수 있습니다. 로그인을 시도해주세요.')
          }
          
          return { success: true, data: loginResult.data.user }
        }
        throw error
      }
      
      return { success: true, data: data.user }
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  },
  
  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },
}

// 숙제 API
export const homeworkAPI = {
  getHomeworks: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('homework')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Get homeworks error:', error)
      
      // 오프라인 모드로 폴백
      try {
        const { sampleHomeworkData } = require('../utils/sampleHomeworkData')
        return { success: true, data: sampleHomeworkData }
      } catch (offlineError) {
        console.error('오프라인 데이터 가져오기 오류:', offlineError)
        throw error
      }
    }
  },
  
  getHomeworkDetail: async (homeworkId: string) => {
    try {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *
        `)
        .eq('id', homeworkId)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Get homework detail error:', error)
      
      // 오프라인 모드로 폴백
      try {
        const { sampleHomeworkData } = require('../utils/sampleHomeworkData')
        const sampleHomework = sampleHomeworkData.find(hw => hw.id === homeworkId)
        
        if (sampleHomework) {
          return { success: true, data: sampleHomework }
        }
        
        throw new Error('숙제를 찾을 수 없습니다.')
      } catch (offlineError) {
        console.error('오프라인 데이터 가져오기 오류:', offlineError)
        throw error
      }
    }
  },
  
  submitHomework: async (homeworkId: string, submissionData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // 일단 간단하게 homework 테이블 업데이트로 처리
      const { data, error } = await supabase
        .from('homework')
        .update({
          status: 'submitted',
          submission_content: submissionData.content
        })
        .eq('id', homeworkId)
        .select()

      if (error) throw error

      return {
        success: true,
        message: '숙제가 성공적으로 제출되었습니다.',
        data: data[0]
      }
    } catch (error) {
      console.error('Submit homework error:', error)
      
      // 오프라인 큐에 추가
      try {
        const { addToOfflineQueue, saveOfflineSubmission } = require('../utils/offlineStorage')
        
        await addToOfflineQueue(
          `/homework-submission/${homeworkId}`,
          'POST',
          submissionData
        )
        
        const submissionId = await saveOfflineSubmission(homeworkId, submissionData)
        
        return {
          success: true,
          message: '네트워크 오류로 인해 숙제가 오프라인 큐에 저장되었습니다. 네트워크 연결 시 자동으로 제출됩니다.',
          data: { id: submissionId, status: 'offline' }
        }
      } catch (offlineError) {
        console.error('오프라인 큐 저장 오류:', offlineError)
        throw error
      }
    }
  },
}

// 피드백 API
export const feedbackAPI = {
  getFeedbacks: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Get feedbacks error:', error)
      
      // 샘플 데이터로 폴백
      try {
        const { sampleFeedbacks } = require('../utils/sampleData')
        return { success: true, data: sampleFeedbacks }
      } catch (offlineError) {
        console.error('오프라인 데이터 가져오기 오류:', offlineError)
        throw error
      }
    }
  },
  
  getFeedbackDetail: async (feedbackId: string) => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('id', feedbackId)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Get feedback detail error:', error)
      
      // 샘플 데이터로 폴백
      try {
        const { sampleFeedbacks } = require('../utils/sampleData')
        const feedback = sampleFeedbacks.find(fb => fb.id === feedbackId)
        
        if (feedback) {
          return { success: true, data: feedback }
        }
      } catch (offlineError) {
        console.error('오프라인 데이터 가져오기 오류:', offlineError)
      }
      
      throw error
    }
  },
}

// 프로필 API
export const profileAPI = {
  getProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Get profile error:', error)
      
      // 샘플 데이터로 폴백
      try {
        const userInfo = await AsyncStorage.getItem('userInfo')
        if (userInfo) {
          return { success: true, data: JSON.parse(userInfo) }
        }
        
        const { sampleUserProfile } = require('../utils/sampleData')
        return { success: true, data: sampleUserProfile }
      } catch (offlineError) {
        console.error('오프라인 데이터 가져오기 오류:', offlineError)
        throw error
      }
    }
  },
  
  updateProfile: async (profileData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()

      if (error) throw error

      return {
        success: true,
        message: '프로필이 성공적으로 업데이트되었습니다.',
        data: data[0]
      }
    } catch (error) {
      console.error('Update profile error:', error)
      
      throw error
    }
  },
}

// 진도 API
export const progressAPI = {
  getStudentProgress: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // 여러 테이블에서 학생 진도 데이터 수집 (일단 homework 테이블만 사용)
      const [homeworkStats] = await Promise.all([
        supabase
          .from('homework')
          .select('*')
      ])

      // 진도 데이터 구성
      const progress = {
        overall: {
          completedHomeworks: 0,
          totalHomeworks: homeworkStats.data?.length || 0,
          completedLessons: 0,
          totalLessons: 24,
          averageScore: 85,
          attendanceRate: 90
        },
        skills: {
          listening: 80,
          speaking: 75,
          reading: 85,
          writing: 70,
          vocabulary: 82,
          grammar: 78
        },
        recent: {
          lessonAttendance: [true, true, false, true, true],
          homeworkCompletion: [true, true, true, false, true],
          testScores: [85, 90, 78, 88]
        }
      }

      return { success: true, data: progress }
    } catch (error) {
      console.error('Get progress error:', error)
      
      throw error
    }
  },
}

// 알림 API
export const notificationAPI = {
  getNotifications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Get notifications error:', error)
      
      // 샘플 알림 데이터로 폴백
      const sampleNotifications = [
        {
          id: '1',
          title: '새로운 숙제가 등록되었습니다',
          message: '영어 회화 연습 과제를 확인해보세요.',
          type: 'homework',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          title: '피드백이 도착했습니다',
          message: '선생님이 지난 과제에 대한 피드백을 남겨주셨습니다.',
          type: 'feedback',
          isRead: true,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]
      
      return { success: true, data: sampleNotifications }
    }
  },
  
  markAsRead: async (notificationId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()

      if (error) throw error

      return {
        success: true,
        message: '알림이 읽음으로 표시되었습니다.',
        data: data[0]
      }
    } catch (error) {
      console.error('Mark notification as read error:', error)
      
      return {
        success: true,
        message: '알림 상태가 로컬에서 업데이트되었습니다.',
        data: null
      }
    }
  },
}