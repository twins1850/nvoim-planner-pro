import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 예약 숙제 존재 및 소유권 확인
    const { data: existingHomework, error: fetchError } = await supabase
      .from('scheduled_homework')
      .select('id, status, planner_id')
      .eq('id', id)
      .eq('planner_id', user.id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Scheduled homework not found' },
        { status: 404 }
      )
    }

    // 이미 전송되었거나 취소된 숙제는 취소할 수 없음
    if (existingHomework.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled homework can be cancelled' },
        { status: 400 }
      )
    }

    // 상태를 'cancelled'로 업데이트
    const { data, error } = await supabase
      .from('scheduled_homework')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('planner_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling scheduled homework:', error)
      return NextResponse.json(
        { error: 'Failed to cancel scheduled homework' },
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