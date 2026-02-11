import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * @swagger
 * /api/courses/analyze-and-recommend:
 *   post:
 *     summary: AI 레벨테스트 분석 및 코스 추천
 *     description: |
 *       OpenAI GPT-4 Vision을 사용하여 학생의 레벨테스트 이미지를 분석하고,
 *       학생의 레벨과 목표에 맞는 코스를 추천합니다.
 *       플래너가 설정한 OpenAI API 키가 필요합니다.
 *     tags:
 *       - Courses
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: 분석할 학생의 ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: AI 분석 및 코스 추천 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysis:
 *                   type: object
 *                   description: 레벨테스트 분석 결과
 *                   properties:
 *                     level:
 *                       type: string
 *                       example: "Level 4"
 *                     scores:
 *                       type: object
 *                       description: 영역별 점수
 *                     strengths:
 *                       type: array
 *                       items:
 *                         type: string
 *                     weaknesses:
 *                       type: array
 *                       items:
 *                         type: string
 *                 recommendations:
 *                   type: array
 *                   description: 추천 코스 목록
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseName:
 *                         type: string
 *                       reason:
 *                         type: string
 *                       difficulty:
 *                         type: string
 *       400:
 *         description: API 키 미설정
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "API 키가 설정되지 않았습니다."
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 학생을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류 또는 API 키 복호화 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await request.json();

    // 1. 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', studentId)
      .eq('planner_id', user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. 플래너의 활성 API 키 조회
    const { data: apiKeyData } = await supabase
      .from('planner_api_keys')
      .select('encrypted_api_key, encryption_iv')
      .eq('planner_id', user.id)
      .eq('api_key_type', 'openai')
      .eq('is_active', true)
      .single();

    if (!apiKeyData) {
      return NextResponse.json({
        error: 'API 키가 설정되지 않았습니다. 설정 > API 키에서 OpenAI API 키를 추가해주세요.'
      }, { status: 400 });
    }

    // 3. API 키 복호화
    const { data: decryptResult } = await supabase.functions.invoke(
      'manage-api-keys',
      {
        body: {
          action: 'decrypt',
          encryptedKey: apiKeyData.encrypted_api_key,
          iv: apiKeyData.encryption_iv
        }
      }
    );

    if (!decryptResult?.apiKey) {
      return NextResponse.json({ error: 'API 키 복호화 실패' }, { status: 500 });
    }

    // 4. OpenAI 클라이언트 초기화
    const openai = new OpenAI({
      apiKey: decryptResult.apiKey
    });

    // 5. 레벨테스트 이미지 분석 (Vision API)
    let levelTestAnalysis = '';
    if (student.level_test_image_url) {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `다음은 앤보임 영어 레벨테스트 결과표입니다.
이미지를 분석하여 다음 정보를 추출해주세요:

1. 테스트 결과 레벨 (예: Level 4)
2. 종합평가 그래프의 각 영역별 점수 (문법, 어휘, 발음, 유창성, 이해력 등)
3. 강점 영역과 약점 영역
4. 전반적인 영어 실력 수준 평가

JSON 형식으로 답변해주세요:
{
  "level": "레벨",
  "scores": {
    "grammar": 점수,
    "vocabulary": 점수,
    "pronunciation": 점수,
    "fluency": 점수,
    "comprehension": 점수
  },
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"],
  "overall_assessment": "전반적 평가"
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: student.level_test_image_url
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      levelTestAnalysis = visionResponse.choices[0].message.content || '';
    }

    // 6. 학습 이력 조회
    const { data: courseHistory } = await supabase
      .from('course_history')
      .select('*')
      .eq('student_id', studentId)
      .order('end_date', { ascending: false })
      .limit(5);

    // 7. AI 추천 생성
    const recommendationPrompt = `
당신은 영어 학습 전문가입니다. 다음 정보를 바탕으로 학생에게 최적의 학습 과정을 추천해주세요.

## 학생 정보
- 이름: ${student.full_name}
- 현재 레벨: ${student.level}

## 레벨테스트 분석 결과
${levelTestAnalysis}

## 학습 목표
- 카테고리: ${student.goal_category || '미설정'}
- 목표 설명: ${student.goal_description || '미설정'}
- 목표 달성 희망일: ${student.goal_target_date || '미설정'}

## 과거 학습 이력
${courseHistory?.map(h => `- ${h.course_name} (${h.level}): ${h.notes || '메모 없음'}`).join('\n') || '없음'}

위 정보를 종합하여 다음을 분석하고 추천해주세요:

1. **3개의 추천 과정** (우선순위별):
   - 과정명
   - 카테고리
   - 레벨
   - 예상 기간
   - 매칭률 (%)
   - 추천 이유

2. **학습 계획**:
   - 각 과정을 얼마나 수강해야 목표를 달성할 수 있는지
   - 예상 소요 기간
   - 학습 순서 및 방향

3. **AI 분석 인사이트**:
   - 학생의 강점 (3가지)
   - 개선이 필요한 영역 (3가지)
   - 학습 방향 제안

JSON 형식으로 답변해주세요:
{
  "recommendations": [
    {
      "course_name": "과정명",
      "category": "카테고리",
      "level": "레벨",
      "duration": "기간",
      "match_percentage": 숫자,
      "reason": "추천 이유",
      "priority_rank": 1
    }
  ],
  "learning_plan": {
    "estimated_duration_weeks": 숫자,
    "course_sequence": ["과정1", "과정2"],
    "milestone_description": "마일스톤 설명"
  },
  "ai_insights": {
    "strengths": ["강점1", "강점2", "강점3"],
    "improvement_areas": ["개선1", "개선2", "개선3"],
    "learning_direction": "학습 방향 제안"
  }
}
`;

    const recommendationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "당신은 20년 경력의 영어 교육 전문가입니다. 학생의 레벨테스트 결과와 목표를 분석하여 최적의 맞춤형 학습 계획을 제공합니다."
        },
        {
          role: "user",
          content: recommendationPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResult = JSON.parse(recommendationResponse.choices[0].message.content || '{}');

    // 8. DB에 추천 저장
    // 기존 추천 비활성화
    await supabase
      .from('course_recommendations')
      .update({ is_active: false })
      .eq('student_id', studentId);

    // 새 추천 저장
    const recommendationsToInsert = aiResult.recommendations.map((rec: any) => ({
      student_id: studentId,
      planner_id: user.id,
      recommended_course_name: rec.course_name,
      course_category: rec.category,
      course_level: rec.level,
      course_duration: rec.duration,
      match_percentage: rec.match_percentage,
      recommendation_reason: rec.reason,
      priority_rank: rec.priority_rank,
      strength_analysis: aiResult.ai_insights.strengths.join(', '),
      improvement_areas: aiResult.ai_insights.improvement_areas.join(', '),
      learning_direction: aiResult.ai_insights.learning_direction,
      is_active: true
    }));

    const { error: insertError } = await supabase
      .from('course_recommendations')
      .insert(recommendationsToInsert);

    if (insertError) {
      console.error('추천 저장 실패:', insertError);
    }

    return NextResponse.json({
      success: true,
      recommendations: aiResult.recommendations,
      learning_plan: aiResult.learning_plan,
      ai_insights: aiResult.ai_insights
    });

  } catch (error: any) {
    console.error('AI 분석 오류:', error);
    return NextResponse.json({
      error: error.message || 'AI 분석 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
