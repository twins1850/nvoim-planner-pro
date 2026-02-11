import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * @swagger
 * /api/scheduled-homework:
 *   post:
 *     summary: 예약 숙제 생성
 *     description: 특정 시간에 학생들에게 자동으로 할당될 숙제를 예약합니다.
 *     tags:
 *       - Homework
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - scheduled_for
 *               - target_students
 *             properties:
 *               title:
 *                 type: string
 *                 description: 숙제 제목
 *                 example: "수학 과제 3단원"
 *               description:
 *                 type: string
 *                 description: 숙제 설명
 *                 example: "방정식 풀이 연습 문제"
 *               instructions:
 *                 type: string
 *                 description: 숙제 수행 지침
 *               estimated_time_minutes:
 *                 type: integer
 *                 description: 예상 소요 시간 (분)
 *                 example: 30
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: 제출 기한
 *               scheduled_for:
 *                 type: string
 *                 format: date-time
 *                 description: 숙제 할당 예약 시간 (미래 시간이어야 함)
 *               target_students:
 *                 type: array
 *                 description: 대상 학생 ID 목록
 *                 items:
 *                   type: string
 *                   format: uuid
 *               lesson_id:
 *                 type: string
 *                 format: uuid
 *                 description: 연결된 수업 ID (선택)
 *     responses:
 *       200:
 *         description: 예약 숙제 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduledHomework'
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락 또는 과거 시간 지정)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/scheduled-homework:
 *   get:
 *     summary: 예약 숙제 목록 조회
 *     description: 현재 플래너가 예약한 숙제 목록을 조회합니다. 상태별 필터링 가능합니다.
 *     tags:
 *       - Homework
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, scheduled, sent, cancelled]
 *         description: 숙제 상태 필터 (미지정 시 전체 조회)
 *         example: scheduled
 *     responses:
 *       200:
 *         description: 예약 숙제 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ScheduledHomework'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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