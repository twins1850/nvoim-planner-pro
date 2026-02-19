import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// nvoimp.com 로그인
async function loginNvoimp(userId: string, passwd: string): Promise<string> {
  const res = await fetch('https://www.nvoimp.com/Member/Process/loginProc.asp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.nvoimp.com/Member/Login.asp',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: `UserID=${encodeURIComponent(userId)}&Passwd=${encodeURIComponent(passwd)}`,
    redirect: 'manual',
  })

  const setCookieRaw = res.headers.getSetCookie?.() ?? []
  const setCookieHeader = res.headers.get('set-cookie') || ''
  const cookies = setCookieRaw.length > 0 ? setCookieRaw.join('; ') : setCookieHeader

  if (!cookies) throw new Error('nvoimp 로그인 실패')
  return cookies
}

// 피드백 HTML 파싱
function parseFeedbackHtml(html: string) {
  const attendanceMatch = html.match(/출결[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const attendance_status = attendanceMatch ? attendanceMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const rateMatch = html.match(/참여도[\s\S]*?(\d+)\s*%/)
  const attendance_rate = rateMatch ? parseInt(rateMatch[1]) : null

  const hwMatch = html.match(/숙제[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const homework_status = hwMatch ? hwMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const attitudeMatch = html.match(/태도[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const attitude = attitudeMatch ? attitudeMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const noteMatch = html.match(/특이사항[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const special_note = noteMatch ? noteMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const sentenceMatch = html.match(/문장[\s\S]*?교정[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const feedback_sentence_en = sentenceMatch ? sentenceMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const pronMatch = html.match(/발음[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const feedback_pronunciation_en = pronMatch ? pronMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const teacherMatch = html.match(/강사[\s\S]*?한마디[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const feedback_teacher_en = teacherMatch ? teacherMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const lessonMatch = html.match(/오늘.*?수업[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const lesson_content = lessonMatch ? lessonMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const nextMatch = html.match(/다음.*?수업[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const next_lesson_content = nextMatch ? nextMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const teacherNameMatch = html.match(/강사명?[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
  const teacher_name = teacherNameMatch ? teacherNameMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  return {
    attendance_status, attendance_rate, homework_status, attitude, special_note,
    feedback_sentence_en, feedback_pronunciation_en, feedback_teacher_en,
    lesson_content, next_lesson_content, teacher_name,
  }
}

// Gemini 2.5 Flash로 영어 피드백 한글 번역
async function translateFeedback(
  apiKey: string,
  teacherComment: string,
  sentenceCorrection: string,
  pronunciationWords: string
): Promise<{ teacher_ko: string; summary_ko: string }> {
  if (!teacherComment && !sentenceCorrection && !pronunciationWords) {
    return { teacher_ko: '', summary_ko: '' }
  }

  const prompt = `당신은 영어학원 원어민 강사 수업 피드백을 한국어로 번역하는 전문가입니다.
영어 피드백을 한국 학생/학부모가 이해하기 쉽고 따뜻한 한국어로 자연스럽게 번역해주세요.

강사한마디: ${teacherComment || '(없음)'}
문장교정: ${sentenceCorrection || '(없음)'}
발음교정 단어: ${pronunciationWords || '(없음)'}

JSON 형식으로만 응답하세요:
{
  "teacher_ko": "번역된 강사한마디 (2-3문장)",
  "summary_ko": "이번 수업 전체 피드백 요약 (2-3문장, 따뜻하고 격려하는 톤)"
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
    }
  )

  const data = await res.json()
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return { teacher_ko: parsed.teacher_ko || '', summary_ko: parsed.summary_ko || '' }
    }
  } catch {
    console.error('번역 JSON 파싱 실패:', responseText)
  }

  return { teacher_ko: responseText, summary_ko: '' }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }
    const plannerId = user.id

    // service_role 클라이언트 (복호화 함수 및 DB 작업용)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json().catch(() => ({}))
    const syncDate = (body.sync_date as string) || new Date().toISOString().slice(0, 10)

    // nvoimp 자격증명 조회
    const { data: creds, error: credsError } = await adminSupabase
      .from('nvoimp_credentials')
      .select('nvoimp_user_id, sync_enabled')
      .eq('planner_id', plannerId)
      .maybeSingle()

    if (credsError || !creds || !creds.sync_enabled) {
      return NextResponse.json({ error: '앤보임 자격증명 없음 또는 비활성화' }, { status: 404 })
    }

    // 비밀번호 복호화 (service_role 필요)
    const { data: decryptedPasswd, error: decryptErr } = await adminSupabase
      .rpc('get_nvoimp_passwd_decrypted', { p_planner_id: plannerId })
    if (decryptErr || !decryptedPasswd) {
      return NextResponse.json({ error: '비밀번호 복호화 실패. 설정에서 다시 저장해주세요.' }, { status: 400 })
    }

    // nvoimp 로그인
    const cookies = await loginNvoimp(creds.nvoimp_user_id, decryptedPasswd)

    // 원스톱 페이지에서 피드백 있는 학생 목록 추출
    const onestopRes = await fetch(
      `https://www.nvoimp.com/Lecture/OneStop.asp?SearchDate=${syncDate}`,
      {
        headers: {
          Cookie: cookies,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.nvoimp.com/',
        },
      }
    )
    const onestopHtml = await onestopRes.text()

    const feedbackEntries: Array<{ nvoimp_student_id: string; seq: string }> = []
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    for (const row of onestopHtml.matchAll(rowPattern)) {
      const rowHtml = row[1]
      const idMatch = rowHtml.match(/F_STDT_ID=(\d+)/)
      const seqMatch = rowHtml.match(/F_PICEDUCCLS_SEQ=(\d+)/)
      if (idMatch && seqMatch) {
        feedbackEntries.push({ nvoimp_student_id: idMatch[1], seq: seqMatch[1] })
      }
    }

    let feedbackTranslated = 0
    let recordsSynced = 0
    const errors: string[] = []

    for (const entry of feedbackEntries) {
      try {
        const { data: profile } = await adminSupabase
          .from('student_profiles')
          .select('id')
          .eq('planner_id', plannerId)
          .eq('nvoimp_student_id', entry.nvoimp_student_id)
          .single()

        if (!profile) continue

        const { data: existing } = await adminSupabase
          .from('lesson_feedback')
          .select('id')
          .eq('student_id', profile.id)
          .eq('lesson_date', syncDate)
          .eq('nvoimp_seq', parseInt(entry.seq))
          .maybeSingle()

        if (existing) continue

        const feedbackRes = await fetch(
          `https://www.nvoimp.com/mypage/MainStudyRoomViewMobile.asp?F_STDT_ID=${entry.nvoimp_student_id}&F_PICEDUCCLS_SEQ=${entry.seq}`,
          {
            headers: {
              Cookie: cookies,
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              Referer: 'https://www.nvoimp.com/Lecture/OneStop.asp',
            },
          }
        )
        const feedbackHtml = await feedbackRes.text()
        const parsed = parseFeedbackHtml(feedbackHtml)

        let teacher_ko = ''
        let summary_ko = ''
        if (parsed.feedback_teacher_en || parsed.feedback_sentence_en) {
          const anthropicKey = process.env.GEMINI_API_KEY
          if (!anthropicKey) {
            errors.push('GEMINI_API_KEY 환경변수 없음 - 번역 건너뜀')
          } else {
            const translated = await translateFeedback(
              anthropicKey,
              parsed.feedback_teacher_en,
              parsed.feedback_sentence_en,
              parsed.feedback_pronunciation_en
            )
            teacher_ko = translated.teacher_ko
            summary_ko = translated.summary_ko
            feedbackTranslated++
          }
        }

        const { error: insertError } = await adminSupabase.from('lesson_feedback').insert({
          planner_id: plannerId,
          student_id: profile.id,
          lesson_date: syncDate,
          nvoimp_seq: parseInt(entry.seq),
          attendance_status: parsed.attendance_status,
          attendance_rate: parsed.attendance_rate,
          homework_status: parsed.homework_status,
          attitude: parsed.attitude,
          special_note: parsed.special_note,
          feedback_sentence_en: parsed.feedback_sentence_en,
          feedback_pronunciation_en: parsed.feedback_pronunciation_en,
          feedback_teacher_en: parsed.feedback_teacher_en,
          feedback_teacher_ko: teacher_ko,
          feedback_summary_ko: summary_ko,
          lesson_content: parsed.lesson_content,
          next_lesson_content: parsed.next_lesson_content,
          teacher_name: parsed.teacher_name,
          translated_at: teacher_ko ? new Date().toISOString() : null,
        })

        if (insertError) {
          errors.push(`피드백 저장 실패: ${insertError.message}`)
          continue
        }

        await Promise.resolve(adminSupabase.from('notifications').insert({
          user_id: profile.id,
          type: 'lesson_feedback',
          title: '📝 오늘의 수업 피드백이 도착했습니다',
          message: summary_ko || '선생님의 피드백을 확인해보세요!',
          data: { lesson_date: syncDate, feedback_seq: entry.seq },
        })).catch(() => {})

        recordsSynced++
      } catch (e) {
        errors.push(`피드백 처리 오류 (${entry.nvoimp_student_id}): ${e}`)
      }
    }

    const duration = Date.now() - startTime
    await adminSupabase.from('nvoimp_sync_log').insert({
      planner_id: plannerId,
      sync_type: 'feedback',
      sync_date: syncDate,
      records_synced: recordsSynced,
      feedback_translated: feedbackTranslated,
      error_message: errors.length > 0 ? errors.slice(0, 5).join('\n') : null,
      duration_ms: duration,
    })

    return NextResponse.json({
      success: true,
      sync_date: syncDate,
      feedback_entries_found: feedbackEntries.length,
      records_synced: recordsSynced,
      feedback_translated: feedbackTranslated,
      errors,
      duration_ms: duration,
    })

  } catch (error) {
    console.error('nvoimp sync-feedback 오류:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
