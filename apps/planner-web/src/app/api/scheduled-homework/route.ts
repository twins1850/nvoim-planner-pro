import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      instructions,
      estimated_time_minutes,
      due_date,
      scheduled_for,
      target_students,
      lesson_id
    } = body

    // 입력 검증
    if (!title || !scheduled_for || !target_students || target_students.length === 0) {
      return NextResponse.json(
        { error: 'Title, scheduled_for, and target_students are required' },
        { status: 400 }
      )
    }

    // 예약 시간이 현재 시간보다 미래인지 확인
    const scheduledTime = new Date(scheduled_for)
    const now = new Date()
    if (scheduledTime <= now) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // 예약 숙제 생성
    const { data, error } = await supabase
      .from('scheduled_homework')
      .insert({
        planner_id: user.id,
        lesson_id: lesson_id || null,
        title,
        description: description || null,
        instructions: instructions || null,
        estimated_time_minutes,
        due_date: due_date ? new Date(due_date).toISOString() : null,
        scheduled_for: scheduledTime.toISOString(),
        target_students: JSON.stringify(target_students),
        status: 'scheduled'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating scheduled homework:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to create scheduled homework',
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URL에서 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // 쿼리 빌드
    let query = supabase
      .from('scheduled_homework')
      .select('*')
      .eq('planner_id', user.id)
      .order('scheduled_for', { ascending: true })

    // 상태 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching scheduled homework:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled homework' },
        { status: 500 }
      )
    }

    // target_students JSON 파싱
    const processedData = data.map(hw => ({
      ...hw,
      target_students: typeof hw.target_students === 'string' 
        ? JSON.parse(hw.target_students) 
        : hw.target_students
    }))

    return NextResponse.json(processedData)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}