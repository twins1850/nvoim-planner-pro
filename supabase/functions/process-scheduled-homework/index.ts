import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ScheduledHomework {
  id: string
  planner_id: string
  lesson_id: string | null
  title: string
  description: string | null
  instructions: string | null
  estimated_time_minutes: number | null
  due_date: string | null
  scheduled_for: string
  target_students: { id: string; name: string }[]
  status: string
}

interface Database {
  public: {
    Tables: {
      scheduled_homework: {
        Row: ScheduledHomework
      }
      homework: {
        Row: any
      }
      homework_assignments: {
        Row: any
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    // CORS 헤더 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    console.log('Processing scheduled homework...')

    // 현재 시간이 지난 예약 숙제들 조회
    const { data: scheduledHomeworks, error: fetchError } = await supabase
      .from('scheduled_homework')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching scheduled homework:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled homework' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${scheduledHomeworks.length} homework items to process`)

    let processedCount = 0
    const errors: string[] = []

    // 각 예약 숙제를 처리
    for (const scheduledHw of scheduledHomeworks) {
      try {
        console.log(`Processing homework: ${scheduledHw.title}`)

        // target_students가 문자열인 경우 파싱
        let targetStudents = scheduledHw.target_students
        if (typeof targetStudents === 'string') {
          targetStudents = JSON.parse(targetStudents)
        }

        // 실제 숙제 생성
        const { data: newHomework, error: homeworkError } = await supabase
          .from('homework')
          .insert({
            planner_id: scheduledHw.planner_id,
            lesson_id: scheduledHw.lesson_id,
            title: scheduledHw.title,
            description: scheduledHw.description,
            instructions: scheduledHw.instructions,
            estimated_time_minutes: scheduledHw.estimated_time_minutes,
            due_date: scheduledHw.due_date,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (homeworkError) {
          console.error('Error creating homework:', homeworkError)
          errors.push(`Failed to create homework for ${scheduledHw.title}: ${homeworkError.message}`)
          continue
        }

        console.log(`Created homework with ID: ${newHomework.id}`)

        // 각 학생에게 숙제 배정
        const assignments = targetStudents.map((student: { id: string; name: string }) => ({
          homework_id: newHomework.id,
          student_id: student.id,
          status: 'pending',
          assigned_at: new Date().toISOString()
        }))

        const { error: assignmentError } = await supabase
          .from('homework_assignments')
          .insert(assignments)

        if (assignmentError) {
          console.error('Error creating homework assignments:', assignmentError)
          errors.push(`Failed to create assignments for ${scheduledHw.title}: ${assignmentError.message}`)
          continue
        }

        console.log(`Created ${assignments.length} homework assignments`)

        // scheduled_homework 상태 업데이트
        const { error: updateError } = await supabase
          .from('scheduled_homework')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduledHw.id)

        if (updateError) {
          console.error('Error updating scheduled homework status:', updateError)
          errors.push(`Failed to update status for ${scheduledHw.title}: ${updateError.message}`)
          continue
        }

        processedCount++
        console.log(`Successfully processed homework: ${scheduledHw.title}`)

      } catch (error) {
        console.error(`Error processing homework ${scheduledHw.title}:`, error)
        errors.push(`Unexpected error for ${scheduledHw.title}: ${error.message}`)
      }
    }

    const result = {
      success: true,
      processedCount,
      totalFound: scheduledHomeworks.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Processing complete:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in process-scheduled-homework:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})