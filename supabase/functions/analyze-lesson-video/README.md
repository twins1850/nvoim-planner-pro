# AI Lesson Video Analysis Edge Function

## Overview
This Edge Function processes lesson videos through a multi-stage AI analysis pipeline to generate insights about student performance, strengths, weaknesses, and homework recommendations.

## Architecture

### Processing Pipeline (8 Steps)
1. **Load Video Record** - Fetch video metadata from database
2. **Load API Keys** - Get planner's active AI API keys
3. **Extract Audio** - Use FFmpeg to extract audio track from video
4. **Compress Audio** - Reduce audio file size by lowering bitrate
5. **AI Analysis Stage 1** - Transcribe audio using OpenAI Whisper
6. **AI Analysis Stage 2** - Generate feedback using GPT-4/Claude
7. **Store Results** - Save analysis to database
8. **Mark Complete** - Update video status to 'completed'

### Current Status
✅ **Completed**:
- Main function structure and error handling
- Database integration (load video, API keys, store results)
- Status tracking through all 6 processing states
- CORS headers and request validation

⏳ **Pending Implementation** (Phase 8.5):
- Audio extraction (FFmpeg integration)
- Audio compression (bitrate reduction)
- OpenAI Whisper API integration
- GPT-4/Claude API integration for feedback
- File system operations in Deno
- Signed URL generation for private storage access

## Implementation Details

### 1. Audio Extraction (FFmpeg)

**Requirements**:
- FFmpeg binary must be available in Edge Function environment
- Extract audio to MP3 or AAC format
- Maintain reasonable quality while reducing file size

**Deno FFmpeg Options**:
```typescript
// Option A: Use FFmpeg WebAssembly port
import { ffmpeg } from 'https://deno.land/x/ffmpeg_wasm@v0.1.0/mod.ts'

// Option B: Shell out to FFmpeg binary (if available)
const process = Deno.run({
  cmd: ['ffmpeg', '-i', inputPath, '-vn', '-acodec', 'mp3', '-ar', '16000', '-ab', '64k', outputPath],
  stdout: 'piped',
  stderr: 'piped'
})

// Option C: Use Supabase Edge Runtime with FFmpeg layer
// https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/_shared
```

**Implementation Function**:
```typescript
async function extractAudio(videoPath: string): Promise<string> {
  // 1. Download video from Supabase Storage using signed URL
  const { data: { signedUrl } } = await supabase.storage
    .from('lesson-videos')
    .createSignedUrl(videoPath, 3600)

  // 2. Download video to temp directory
  const response = await fetch(signedUrl)
  const videoBuffer = await response.arrayBuffer()
  const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`
  await Deno.writeFile(tempVideoPath, new Uint8Array(videoBuffer))

  // 3. Extract audio using FFmpeg
  const tempAudioPath = `/tmp/${crypto.randomUUID()}.mp3`
  // ... FFmpeg extraction logic ...

  // 4. Upload audio to Supabase Storage
  const audioFile = await Deno.readFile(tempAudioPath)
  const audioStoragePath = `${videoPath.split('/')[0]}/audio_${Date.now()}.mp3`

  await supabase.storage
    .from('lesson-videos')
    .upload(audioStoragePath, audioFile)

  // 5. Clean up temp files
  await Deno.remove(tempVideoPath)
  await Deno.remove(tempAudioPath)

  return audioStoragePath
}
```

### 2. Audio Compression

**Target Specifications**:
- Sample rate: 16kHz (sufficient for speech recognition)
- Bitrate: 64kbps (good balance of quality and size)
- Format: MP3 or AAC
- Expected compression: 500MB video → 5-10MB audio

**Implementation Function**:
```typescript
async function compressAudio(audioPath: string): Promise<{
  path: string
  size_mb: number
}> {
  // Download audio from storage
  const { data: { signedUrl } } = await supabase.storage
    .from('lesson-videos')
    .createSignedUrl(audioPath, 3600)

  const response = await fetch(signedUrl)
  const audioBuffer = await response.arrayBuffer()
  const tempInputPath = `/tmp/${crypto.randomUUID()}.mp3`
  await Deno.writeFile(tempInputPath, new Uint8Array(audioBuffer))

  // Compress using FFmpeg
  const tempOutputPath = `/tmp/${crypto.randomUUID()}_compressed.mp3`

  // FFmpeg command: reduce bitrate and sample rate
  // ffmpeg -i input.mp3 -ar 16000 -ab 64k output.mp3

  // Upload compressed audio
  const compressedFile = await Deno.readFile(tempOutputPath)
  const compressedStoragePath = audioPath.replace('.mp3', '_compressed.mp3')

  await supabase.storage
    .from('lesson-videos')
    .upload(compressedStoragePath, compressedFile)

  // Calculate file size
  const sizeMB = compressedFile.byteLength / (1024 * 1024)

  // Clean up
  await Deno.remove(tempInputPath)
  await Deno.remove(tempOutputPath)

  return {
    path: compressedStoragePath,
    size_mb: Number(sizeMB.toFixed(2))
  }
}
```

### 3. OpenAI Whisper API Integration

**API Endpoint**: `https://api.openai.com/v1/audio/transcriptions`

**Implementation Function**:
```typescript
interface TranscriptionResult {
  transcript: string
  tokens_used: number
  cost_usd: number
}

async function transcribeAudio(
  audioPath: string,
  apiKey: string
): Promise<TranscriptionResult> {
  // Download audio file
  const { data: { signedUrl } } = await supabase.storage
    .from('lesson-videos')
    .createSignedUrl(audioPath, 3600)

  const response = await fetch(signedUrl)
  const audioBuffer = await response.arrayBuffer()

  // Prepare form data
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer]), 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'ko') // Korean language

  // Call Whisper API
  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!whisperResponse.ok) {
    throw new Error(`Whisper API error: ${whisperResponse.statusText}`)
  }

  const result = await whisperResponse.json()

  // Estimate cost (Whisper pricing: $0.006 per minute)
  // Approximate based on audio file size
  const audioSizeMB = audioBuffer.byteLength / (1024 * 1024)
  const estimatedMinutes = audioSizeMB / 0.5 // Rough estimate
  const cost = estimatedMinutes * 0.006

  return {
    transcript: result.text,
    tokens_used: Math.floor(result.text.length / 4), // Rough token estimate
    cost_usd: Number(cost.toFixed(4))
  }
}
```

### 4. GPT-4/Claude Feedback Generation

**GPT-4 Implementation**:
```typescript
interface FeedbackResult {
  summary: string
  strengths: string[]
  weaknesses: string[]
  homework: {
    title: string
    description: string
    difficulty: string
    focus_areas: string[]
  }
  tokens_used: number
  cost_usd: number
}

async function generateFeedback(
  transcript: string,
  apiKey: ApiKey
): Promise<FeedbackResult> {
  if (apiKey.api_key_type === 'openai') {
    return await generateFeedbackGPT4(transcript, apiKey.encrypted_api_key)
  } else if (apiKey.api_key_type === 'anthropic') {
    return await generateFeedbackClaude(transcript, apiKey.encrypted_api_key)
  } else {
    throw new Error('Unsupported API key type for feedback generation')
  }
}

async function generateFeedbackGPT4(
  transcript: string,
  apiKey: string
): Promise<FeedbackResult> {
  const systemPrompt = `You are an expert language teacher analyzing a lesson transcript. Provide:
1. A concise lesson summary (2-3 sentences)
2. Student strengths (2-4 points)
3. Student weaknesses (2-4 points)
4. Recommended homework with title, description, difficulty, and focus areas

Respond in Korean with a structured JSON format.`

  const userPrompt = `Analyze this lesson transcript and provide feedback:\n\n${transcript}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    throw new Error(`GPT-4 API error: ${response.statusText}`)
  }

  const result = await response.json()
  const feedback = JSON.parse(result.choices[0].message.content)

  // Calculate cost (GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens)
  const inputTokens = result.usage.prompt_tokens
  const outputTokens = result.usage.completion_tokens
  const cost = (inputTokens / 1000) * 0.01 + (outputTokens / 1000) * 0.03

  return {
    summary: feedback.summary,
    strengths: feedback.strengths,
    weaknesses: feedback.weaknesses,
    homework: feedback.homework,
    tokens_used: result.usage.total_tokens,
    cost_usd: Number(cost.toFixed(4))
  }
}

async function generateFeedbackClaude(
  transcript: string,
  apiKey: string
): Promise<FeedbackResult> {
  // Similar implementation for Claude API
  // Anthropic API endpoint: https://api.anthropic.com/v1/messages
  // Model: claude-3-opus-20240229
  // Pricing: $15 per 1M input tokens, $75 per 1M output tokens
}
```

## Environment Variables

Required in Supabase Edge Function environment:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Planner API keys are loaded from `planner_api_keys` table at runtime.

## Testing

### Local Testing with Supabase CLI
```bash
# Start local Supabase
supabase start

# Deploy function locally
supabase functions serve analyze-lesson-video

# Test with curl
curl -X POST http://localhost:54321/functions/v1/analyze-lesson-video \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"videoId": "123e4567-e89b-12d3-a456-426614174000"}'
```

### Unit Testing
```bash
# Run Deno tests
deno test --allow-net --allow-read --allow-write --allow-env
```

## Deployment

```bash
# Deploy to production
supabase functions deploy analyze-lesson-video

# Check logs
supabase functions logs analyze-lesson-video
```

## Error Handling

The function includes comprehensive error handling:
- Video not found (404)
- No active API keys (400)
- FFmpeg errors (500)
- AI API errors (500)
- Storage errors (500)

All errors update the `lesson_videos.processing_status` to 'failed' and store error messages.

## Performance Considerations

### Expected Processing Times
- Audio extraction: 30-60 seconds
- Audio compression: 10-20 seconds
- Whisper transcription: 1-2 minutes
- GPT-4 feedback: 20-40 seconds
- **Total: 3-5 minutes for 25-minute video**

### Cost Estimates (25-minute lesson)
- OpenAI Whisper: $0.15
- GPT-4 Turbo: $0.10-0.15
- **Total per lesson: $0.25-0.30**

### Optimization Opportunities
1. **Parallel processing**: Run compression and transcription in parallel where possible
2. **Caching**: Cache common transcription patterns
3. **Batch processing**: Process multiple videos in queue
4. **Audio streaming**: Stream audio directly to Whisper API instead of temp files

## Next Steps

1. ✅ Create function structure and database integration
2. ⏳ Implement FFmpeg audio extraction
3. ⏳ Implement audio compression
4. ⏳ Integrate OpenAI Whisper API
5. ⏳ Integrate GPT-4/Claude API
6. ⏳ Add comprehensive error handling
7. ⏳ Write unit tests
8. ⏳ Deploy and test in staging environment
9. ⏳ Performance optimization
10. ⏳ Production deployment

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno FFmpeg](https://deno.land/x/ffmpeg)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI GPT-4 API](https://platform.openai.com/docs/guides/gpt)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
