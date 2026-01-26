# Phase 8 AI Video Analysis - Testing Guide

## Prerequisites

1. ✅ Supabase migrations applied
2. ✅ Edge Function deployed
3. ✅ OpenAI API key registered in app
4. ✅ Test video ready (< 25MB, 5-10 minutes recommended)

## Test Scenarios

### Scenario 1: Happy Path - Complete Video Analysis

**Objective**: Verify end-to-end video analysis workflow

**Steps**:
1. Navigate to `/lessons/analyze`
2. Select test video file (MP4, < 25MB)
3. Click "분석 시작" button
4. Observe upload progress
5. Verify redirect to `/lessons/[id]` page
6. Wait for processing (check status updates)
7. Verify analysis results display:
   - ✅ Video title
   - ✅ Lesson summary (Korean)
   - ✅ Student strengths (2-4 items)
   - ✅ Student weaknesses (2-4 items)
   - ✅ Recommended homework with title, description, difficulty
   - ✅ Transcript (collapsible)
   - ✅ Analysis metadata (models, tokens, cost)

**Expected Results**:
- Upload completes within 10-30 seconds
- Processing status updates every 5 seconds
- Analysis completes within 3-5 minutes for 25-minute video
- All fields populated with Korean text
- Cost displayed: ~$0.25-0.30

**Success Criteria**: All steps complete without errors, results accurate

---

### Scenario 2: Homework Integration

**Objective**: Verify one-click homework creation from recommendations

**Steps**:
1. Complete Scenario 1 to get analysis results
2. Click "숙제로 추가" button on recommended homework card
3. Verify success message appears
4. Navigate to `/homework` page
5. Verify new homework appears in list
6. Verify homework details match recommendations:
   - ✅ Title
   - ✅ Description
   - ✅ Difficulty level
   - ✅ Focus areas in resources

**Expected Results**:
- Success alert shows immediately
- Homework created with all fields populated
- Redirect to `/homework` page

**Success Criteria**: Homework successfully created and visible

---

### Scenario 3: Error Handling - No API Key

**Objective**: Verify graceful error handling when API key missing

**Steps**:
1. Remove or deactivate all API keys in `/settings/api-keys`
2. Navigate to `/lessons/analyze`
3. Upload test video
4. Observe error message

**Expected Results**:
- Upload succeeds
- Error message displays: "활성화된 API 키가 없습니다. 설정에서 API 키를 먼저 등록해주세요."
- Link to API key settings appears
- No partial data created

**Success Criteria**: Clear error message, graceful failure

---

### Scenario 4: Error Handling - File Too Large

**Objective**: Verify file size validation

**Steps**:
1. Select video file > 500MB
2. Observe validation error

**Expected Results**:
- Immediate validation error before upload
- Error message: "파일 크기는 최대 500MB까지 지원합니다."

**Success Criteria**: Upload blocked, clear error message

---

### Scenario 5: Polling During Processing

**Objective**: Verify status updates during analysis

**Steps**:
1. Upload test video
2. Observe status transitions on `/lessons/[id]` page
3. Verify polling mechanism (every 5 seconds)

**Expected Status Transitions**:
1. `uploaded` → "업로드 완료. 분석 대기 중..."
2. `extracting_audio` → "비디오에서 오디오를 추출하는 중..."
3. `compressing` → "오디오 파일을 압축하는 중..."
4. `analyzing` → "AI가 수업 내용을 분석하는 중..."
5. `completed` → Display results

**Expected Results**:
- Status updates automatically every 5 seconds
- Loading spinner visible during processing
- Estimated time message shows

**Success Criteria**: Smooth status transitions, accurate messaging

---

### Scenario 6: API Cost Tracking

**Objective**: Verify accurate cost calculation and display

**Steps**:
1. Complete video analysis
2. Review analysis metadata section
3. Calculate expected cost manually:
   - Whisper: (video_duration_minutes * $0.006)
   - GPT-4: (tokens_used / 1000) * ($0.01 input + $0.03 output)

**Expected Results**:
- Tokens used displayed accurately
- Cost displayed with 4 decimal places
- Cost breakdown matches manual calculation (±$0.01)

**Success Criteria**: Accurate cost tracking within margin

---

### Scenario 7: Multiple API Keys

**Objective**: Verify API key selection logic

**Setup**:
1. Register both OpenAI and Anthropic API keys
2. Mark OpenAI as active

**Steps**:
1. Upload and analyze video
2. Verify OpenAI (Whisper + GPT-4) used
3. Deactivate OpenAI key, activate Anthropic key
4. Upload and analyze another video
5. Verify Anthropic (Claude) used

**Expected Results**:
- Analysis uses active API key type
- Model names displayed correctly:
  - OpenAI: "whisper-1" + "gpt-4-turbo"
  - Anthropic: "whisper-1" + "claude-3-opus"

**Success Criteria**: Correct API selected based on active keys

---

## Performance Benchmarks

### Video Processing Times (Expected)

| Video Duration | Upload Time | Processing Time | Total Time |
|----------------|-------------|-----------------|------------|
| 5 minutes      | 5-10s       | 1-2 min         | 1.5-2.5 min|
| 10 minutes     | 10-20s      | 2-3 min         | 2.5-4 min  |
| 25 minutes     | 20-40s      | 3-5 min         | 4-6 min    |

### Cost Benchmarks (Expected)

| Video Duration | Whisper Cost | GPT-4 Cost | Total Cost |
|----------------|--------------|------------|------------|
| 5 minutes      | $0.03        | $0.05      | $0.08      |
| 10 minutes     | $0.06        | $0.07      | $0.13      |
| 25 minutes     | $0.15        | $0.10-0.15 | $0.25-0.30 |

---

## Monitoring and Debugging

### Supabase Dashboard Checks

1. **Edge Function Logs**:
   - Navigate to: Edge Functions → analyze-lesson-video → Logs
   - Look for: `[Step 1]`, `[Step 2]`, etc. log messages
   - Verify: No error logs during processing

2. **Database Records**:
   - Table: `lesson_videos`
   - Check: `processing_status` field transitions
   - Verify: `error_message` is NULL for successful analyses

3. **Storage Bucket**:
   - Bucket: `lesson-videos`
   - Check: Video files uploaded successfully
   - Verify: Audio files created (if FFmpeg implemented)

### Client-Side Debugging

1. **Browser Console**:
   - Look for: Upload errors, function invocation errors
   - Check: Network tab for API calls

2. **React DevTools**:
   - Component: `LessonAnalyzePage`, `LessonResultPage`
   - Check: State updates during upload and processing

---

## Rollback Procedures

### If Deployment Fails

1. **Edge Function Rollback**:
   ```bash
   supabase functions delete analyze-lesson-video
   ```

2. **Database Migration Rollback**:
   - Not recommended unless data corruption occurs
   - Contact DBA if needed

3. **Storage Bucket Cleanup**:
   - Manually delete test files from Supabase Storage
   - Bucket itself should remain for future attempts

---

## Success Metrics

### Functional Metrics
- ✅ 100% of test scenarios pass
- ✅ No critical errors in Edge Function logs
- ✅ Response times within expected ranges
- ✅ Cost calculations accurate within ±$0.01

### User Experience Metrics
- ✅ Upload UX smooth and intuitive
- ✅ Status updates clear and timely
- ✅ Analysis results comprehensive and readable
- ✅ Error messages helpful and actionable

### Performance Metrics
- ✅ API response time < 200ms
- ✅ Edge Function execution < 5 minutes
- ✅ Database queries < 100ms

---

## Post-Deployment Verification

1. ✅ All test scenarios completed
2. ✅ No errors in Supabase logs
3. ✅ Cost tracking accurate
4. ✅ Homework integration working
5. ✅ User feedback positive

**Status**: Ready for beta testing with 30 planners
