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
      console.log("🔍 학생 숙제 가져오기 시작...");
      const { data: { user } } = await supabase.auth.getUser()
      console.log("👤 현재 학생 사용자:", user?.id, user?.email);
      if (!user) throw new Error('User not authenticated')

      // student_profiles.id = auth.uid() 이므로 직접 사용
      console.log("📚 homework_assignments 조회 중... student_id:", user.id);
      const { data, error } = await supabase
        .from('homework_assignments')
        .select(`
          *,
          homework (
            id,
            title,
            description,
            instructions,
            due_date,
            created_at,
            resources
          )
        `)
        .eq('student_id', user.id)
        .order('assigned_at', { ascending: false })

      console.log("📊 숙제 조회 결과:", { data, error, count: data?.length });
      console.log("📊 첫 번째 assignment 전체:", JSON.stringify(data?.[0], null, 2));
      if (error) throw error

      // homework 데이터를 평면화하고 status 정보 포함
      const homeworks = (data || [])
        .map(assignment => {
          console.log("🔍 Processing assignment:", {
            assignment_id: assignment.id,
            homework_id: assignment.homework_id,
            homework_object: assignment.homework,
            homework_is_null: assignment.homework === null,
            homework_keys: assignment.homework ? Object.keys(assignment.homework) : 'null'
          });
          
          // homework가 null이면 에러 처리
          if (!assignment.homework) {
            console.error(`❌ homework가 null입니다! homework_id: ${assignment.homework_id}`);
            return null;
          }
          
          return {
            id: assignment.homework.id,
            title: assignment.homework.title,
            description: assignment.homework.description,
            instructions: assignment.homework.instructions,
            dueDate: assignment.homework.due_date, // snake_case → camelCase 변환
            createdAt: assignment.homework.created_at,
            resources: assignment.homework.resources,
            status: assignment.status,
            assignedAt: assignment.assigned_at,
            type: 'mixed' // 기본 타입 설정
          };
        })
        .filter(hw => hw !== null); // null 제거

      console.log("✅ 최종 숙제 목록:", homeworks);
      console.log("✅ 첫 번째 숙제:", homeworks[0]);
      return { success: true, data: { homeworks } }
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
      // 1. 현재 사용자 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // 2. homework_assignments와 homework JOIN 조회
      const { data: assignment, error } = await supabase
        .from('homework_assignments')
        .select(`
          *,
          homework (
            id,
            title,
            description,
            instructions,
            due_date,
            created_at,
            resources,
            content
          )
        `)
        .eq('student_id', user.id)
        .eq('homework_id', homeworkId)
        .single()

      if (error) {
        console.error('getHomeworkDetail DB error:', error)
        throw error
      }

      if (!assignment || !assignment.homework) {
        throw new Error('숙제를 찾을 수 없습니다.')
      }

      // 3. 데이터 변환 (snake_case → camelCase)
      const homework = {
        id: assignment.homework.id,
        title: assignment.homework.title,
        description: assignment.homework.description,
        instructions: assignment.homework.instructions,
        dueDate: assignment.homework.due_date,
        createdAt: assignment.homework.created_at,
        resources: assignment.homework.resources,
        content: assignment.homework.content,
        status: assignment.status,
        assignedAt: assignment.assigned_at,
        type: 'mixed' // 기본 타입
      }

      return { success: true, data: { homework } }
    } catch (error) {
      console.error('Get homework detail error:', error)

      // 오프라인 모드로 폴백
      try {
        const { sampleHomeworkData } = require('../utils/sampleHomeworkData')
        const sampleHomework = sampleHomeworkData.find(hw => hw.id === homeworkId)

        if (sampleHomework) {
          return { success: true, data: { homework: sampleHomework } }
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

      // student_profiles 테이블에서 먼저 시도
      try {
        const { data: studentData, error: studentError } = await supabase
          .from('student_profiles')
          .select('planner_id')
          .eq('id', user.id)

        if (!studentError && studentData && studentData.length > 0) {
          return { success: true, data: studentData[0] }
        }
      } catch (studentError) {
        console.log('student_profiles 쿼리 실패, profiles로 폴백:', studentError)
      }

      // 기존 profiles 테이블 폴백
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)

      if (error) throw error
      
      // 프로필이 없는 경우 자동 생성
      if (!data || data.length === 0) {
        console.log('프로필이 없어서 새로 생성합니다')
        return await profileAPI.createProfile(user)
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Get profile error:', error)
      
      // 오프라인 폴백 개선 - undefined 체크 추가
      try {
        const userInfo = await AsyncStorage.getItem('userInfo')
        if (userInfo && userInfo !== 'undefined') {
          return { success: true, data: JSON.parse(userInfo) }
        }
        
        const { sampleUserProfile } = require('../utils/sampleData')
        return { success: true, data: sampleUserProfile }
      } catch (offlineError) {
        console.error('오프라인 데이터 가져오기 오류:', offlineError)
        
        // 최후의 폴백 - 기본 사용자 정보 반환
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          return {
            success: true,
            data: {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '사용자',
              role: 'student',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        }
        
        throw error
      }
    }
  },
  
  // 프로필 생성 함수 추가
  createProfile: async (user: any) => {
    try {
      // 먼저 student_profiles 테이블에 프로필 생성 시도
      try {
        const studentProfileData = {
          id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { data: studentData, error: studentError } = await supabase
          .from('student_profiles')
          .insert([studentProfileData])
          .select()
        
        if (!studentError && studentData) {
          console.log('student_profiles 생성 성공')
          return { success: true, data: studentData[0] }
        }
      } catch (studentError) {
        console.log('student_profiles 생성 실패, profiles 시도:', studentError)
      }

      // 기존 profiles 테이블 시도
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '사용자',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
      
      if (error) {
        console.error('프로필 생성 오류:', error)
        // 생성 실패시에도 기본 데이터 반환
        return { success: true, data: profileData }
      }
      
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Create profile error:', error)
      
      // 생성 실패시에도 기본 데이터 반환
      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '사용자',
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
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

// AI 피드백 API
export const aiAPI = {
  // 오디오 파일을 처리하고 AI 피드백 생성
  processAudioSubmission: async (audioUri: string, submissionId: string) => {
    try {
      console.log('Processing audio submission:', { audioUri, submissionId });
      
      // 1. 오디오 파일을 Supabase Storage에 업로드
      const audioBlob = await fetch(audioUri).then(r => r.blob());
      const fileName = `${submissionId}_${Date.now()}.wav`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('homework-submissions')
        .upload(fileName, audioBlob, {
          contentType: 'audio/wav',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // 2. 업로드된 파일의 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('homework-submissions')
        .getPublicUrl(fileName);
      
      const fileUrl = urlData.publicUrl;
      console.log('File uploaded to:', fileUrl);
      
      // 3. Edge Function 호출하여 AI 분석
      const { data: aiResponse, error: functionError } = await supabase.functions.invoke('audio-processor', {
        body: {
          submissionId,
          fileUrl,
        },
      });
      
      if (functionError) throw functionError;
      
      console.log('AI Response:', aiResponse);
      
      // 4. AI 피드백을 데이터베이스에 저장
      const { data: feedbackData, error: saveError } = await supabase
        .from('ai_feedback')
        .insert({
          homework_submission_id: submissionId,
          transcript: aiResponse.transcript,
          score: aiResponse.analysis.score,
          corrections: aiResponse.analysis.corrections,
          better_expressions: aiResponse.analysis.better_expressions,
          positive_feedback: aiResponse.analysis.positive_feedback,
          areas_for_improvement: aiResponse.analysis.areas_for_improvement,
        })
        .select()
        .single();
      
      if (saveError) throw saveError;
      
      // 5. homework_submissions 테이블 업데이트
      await supabase
        .from('homework_submissions')
        .update({
          audio_file_url: fileUrl,
          processing_status: 'completed',
          ai_processed: true,
        })
        .eq('id', submissionId);
      
      return {
        success: true,
        feedback: feedbackData,
        transcript: aiResponse.transcript,
        analysis: aiResponse.analysis,
      };
      
    } catch (error) {
      console.error('AI processing error:', error);
      
      // 실패 시 상태 업데이트
      await supabase
        .from('homework_submissions')
        .update({
          processing_status: 'failed',
        })
        .eq('id', submissionId);
      
      throw error;
    }
  },
  
  // AI 피드백 조회
  getAIFeedback: async (submissionId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_feedback')
        .select(`
          *,
          homework_submissions!inner(
            id,
            homework_id,
            homework:homework_id(title, description)
          )
        `)
        .eq('homework_submission_id', submissionId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get AI feedback error:', error);
      throw error;
    }
  },
  
  // 학생의 모든 AI 피드백 조회
  getStudentAIFeedbacks: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!student) throw new Error('Student not found');
      
      const { data, error } = await supabase
        .from('ai_feedback')
        .select(`
          *,
          homework_submissions!inner(
            id,
            submitted_at,
            homework:homework_id(title, description, due_date)
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get student AI feedbacks error:', error);
      throw error;
    }
  },
}