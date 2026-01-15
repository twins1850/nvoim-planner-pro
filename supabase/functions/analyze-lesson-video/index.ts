// ============================================================================
// Edge Function: analyze-lesson-video
// Purpose: AI-powered analysis of lesson videos
// Flow: Video → Audio Extraction → Compression → AI Analysis → Results Storage
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface AnalyzeRequest {
  videoId: string
}

interface VideoRecord {
  id: string
  planner_id: string
  video_storage_path: string
  video_title: string
  file_size_mb: number
}

interface ApiKey {
  id: string
  api_key_type: string
  encrypted_api_key: string
  encryption_iv: string
  key_name: string
}

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: getCorsHeaders() })
    }

    // Parse request
    const { videoId }: AnalyzeRequest = await req.json()

    if (!videoId) {
      return errorResponse('videoId is required', 400)
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse('Supabase configuration missing', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ========================================================================
    // Step 1: Load video record
    // ========================================================================
    console.log(`[Step 1] Loading video record: ${videoId}`)

    const { data: video, error: videoError } = await supabase
      .from('lesson_videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return errorResponse(`Video not found: ${videoId}`, 404)
    }

    const videoData = video as VideoRecord
    console.log(`[Step 1] Video loaded: ${videoData.video_title}`)

    // ========================================================================
    // Step 2: Load planner's API keys
    // ========================================================================
    console.log(`[Step 2] Loading planner API keys: ${videoData.planner_id}`)

    const { data: apiKeys, error: apiKeyError } = await supabase
      .from('planner_api_keys')
      .select('*')
      .eq('planner_id', videoData.planner_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (apiKeyError || !apiKeys || apiKeys.length === 0) {
      await updateVideoStatus(supabase, videoId, 'failed', 'No active API keys found')
      return errorResponse('Planner has no active API keys', 400)
    }

    const keys = apiKeys as ApiKey[]
    console.log(`[Step 2] Found ${keys.length} active API keys`)

    // ========================================================================
    // Step 3: Extract audio from video
    // ========================================================================
    console.log(`[Step 3] Extracting audio from video: ${videoData.video_storage_path}`)

    await updateVideoStatus(supabase, videoId, 'extracting_audio')

    const audioPath = await extractAudio(supabase, videoData.video_storage_path)

    console.log(`[Step 3] Audio extracted: ${audioPath}`)

    // ========================================================================
    // Step 4: Compress audio
    // ========================================================================
    console.log(`[Step 4] Compressing audio: ${audioPath}`)

    await updateVideoStatus(supabase, videoId, 'compressing')

    const compressionResult = await compressAudio(supabase, audioPath)
    const compressedAudioPath = compressionResult.path
    const compressedSizeMB = compressionResult.size_mb

    // Update audio path in database
    await supabase
      .from('lesson_videos')
      .update({
        audio_storage_path: compressedAudioPath,
        compressed_audio_size_mb: compressedSizeMB
      })
      .eq('id', videoId)

    console.log(`[Step 4] Audio compressed: ${compressedSizeMB}MB`)

    // ========================================================================
    // Step 5: AI Analysis - Stage 1 (Transcription)
    // ========================================================================
    console.log(`[Step 5] Starting AI analysis stage 1: Transcription`)

    await updateVideoStatus(supabase, videoId, 'analyzing')

    // Find OpenAI key for Whisper
    const openaiKey = keys.find(k => k.api_key_type === 'openai')

    if (!openaiKey) {
      await updateVideoStatus(supabase, videoId, 'failed', 'OpenAI API key required for transcription')
      return errorResponse('OpenAI API key required', 400)
    }

    // Decrypt OpenAI API key
    console.log('[Step 5] Decrypting OpenAI API key...')
    const decryptedOpenaiKey = await decryptApiKey(
      openaiKey.encrypted_api_key,
      openaiKey.encryption_iv
    )

    const transcriptionResult = await transcribeAudio(
      supabase,
      compressedAudioPath,
      decryptedOpenaiKey
    )

    console.log(`[Step 5] Transcription complete: ${transcriptionResult.tokens_used} tokens`)

    // ========================================================================
    // Step 6: AI Analysis - Stage 2 (Feedback Generation)
    // ========================================================================
    console.log(`[Step 6] Starting AI analysis stage 2: Feedback`)

    // Find key for feedback (prefer GPT-4 or Claude)
    const feedbackKey = keys.find(k =>
      k.api_key_type === 'openai' || k.api_key_type === 'anthropic'
    )

    if (!feedbackKey) {
      await updateVideoStatus(supabase, videoId, 'failed', 'No suitable API key for feedback generation')
      return errorResponse('No suitable API key for feedback', 400)
    }

    // Decrypt feedback API key
    console.log('[Step 6] Decrypting feedback API key...')
    const decryptedFeedbackKey = await decryptApiKey(
      feedbackKey.encrypted_api_key,
      feedbackKey.encryption_iv
    )

    const feedbackResult = await generateFeedback(
      transcriptionResult.transcript,
      {
        ...feedbackKey,
        encrypted_api_key: decryptedFeedbackKey
      }
    )

    console.log(`[Step 6] Feedback complete: ${feedbackResult.tokens_used} tokens`)

    // ========================================================================
    // Step 7: Store analysis results
    // ========================================================================
    console.log(`[Step 7] Storing analysis results`)

    const totalCost = transcriptionResult.cost_usd + feedbackResult.cost_usd

    const { error: analysisError } = await supabase
      .from('ai_lesson_analyses')
      .insert({
        lesson_video_id: videoId,
        planner_id: videoData.planner_id,
        analysis_model_1: 'openai-whisper',
        analysis_model_2: feedbackKey.api_key_type === 'openai' ? 'gpt-4-turbo' : 'claude-3-opus',
        lesson_summary: feedbackResult.summary,
        student_strengths: feedbackResult.strengths,
        student_weaknesses: feedbackResult.weaknesses,
        recommended_homework: feedbackResult.homework,
        transcript: transcriptionResult.transcript,
        api_1_tokens_used: transcriptionResult.tokens_used,
        api_2_tokens_used: feedbackResult.tokens_used,
        estimated_cost_usd: totalCost
      })

    if (analysisError) {
      console.error('[Step 7] Failed to store analysis:', analysisError)
      await updateVideoStatus(supabase, videoId, 'failed', 'Failed to store analysis results')
      return errorResponse('Failed to store analysis', 500)
    }

    // ========================================================================
    // Step 8: Mark as completed
    // ========================================================================
    console.log(`[Step 8] Marking video as completed`)

    await updateVideoStatus(supabase, videoId, 'completed')

    console.log(`[Complete] Analysis finished successfully`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        total_cost_usd: totalCost,
        total_tokens: transcriptionResult.tokens_used + feedbackResult.tokens_used
      }),
      {
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Edge Function error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
})

// ============================================================================
// API Key Decryption Utility
// ============================================================================

/**
 * Decrypt API key using AES-GCM
 * Matches the encryption logic in manage-api-keys Edge Function
 */
async function decryptApiKey(encryptedKey: string, iv: string): Promise<string> {
  try {
    // Get encryption key from environment variable
    const keyBase64 = Deno.env.get('API_KEY_ENCRYPTION_KEY')

    if (!keyBase64) {
      throw new Error('API_KEY_ENCRYPTION_KEY environment variable not set')
    }

    // Decode base64 encryption key
    const binaryString = atob(keyBase64)
    const keyData = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      keyData[i] = binaryString.charCodeAt(i)
    }

    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // Decode base64 IV
    const ivBinaryString = atob(iv)
    const ivArray = new Uint8Array(ivBinaryString.length)
    for (let i = 0; i < ivBinaryString.length; i++) {
      ivArray[i] = ivBinaryString.charCodeAt(i)
    }

    // Decode base64 encrypted data
    const encryptedBinaryString = atob(encryptedKey)
    const encryptedArray = new Uint8Array(encryptedBinaryString.length)
    for (let i = 0; i < encryptedBinaryString.length; i++) {
      encryptedArray[i] = encryptedBinaryString.charCodeAt(i)
    }

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      cryptoKey,
      encryptedArray
    )

    // Decode to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error: any) {
    console.error('[Decryption Error]:', error)
    throw new Error(`Failed to decrypt API key: ${error.message}`)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function updateVideoStatus(
  supabase: any,
  videoId: string,
  status: string,
  errorMessage?: string
) {
  const updateData: any = { processing_status: status }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  await supabase
    .from('lesson_videos')
    .update(updateData)
    .eq('id', videoId)
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      status
    }
  )
}

// ============================================================================
// AI Integration Functions
// ============================================================================

interface TranscriptionResult {
  transcript: string
  tokens_used: number
  cost_usd: number
}

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

/**
 * Extract audio from video using FFmpeg
 * NOTE: FFmpeg processing in Supabase Edge Functions requires additional setup.
 * Options: 1) FFmpeg WebAssembly, 2) External processing service, 3) Client-side extraction
 * For now, this returns the video path directly (Whisper API accepts video files up to 25MB)
 */
async function extractAudio(
  supabase: any,
  videoPath: string
): Promise<string> {
  try {
    // For production: Implement FFmpeg processing or use external service
    // Current approach: Return video path directly (Whisper supports video files)
    console.log('[Audio Extraction] Skipping FFmpeg - using video file directly')
    return videoPath

    /* Production implementation with FFmpeg would look like:
    // 1. Download video from storage
    const { data: { signedUrl } } = await supabase.storage
      .from('lesson-videos')
      .createSignedUrl(videoPath, 3600)

    const response = await fetch(signedUrl)
    const videoBuffer = await response.arrayBuffer()
    const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`
    await Deno.writeFile(tempVideoPath, new Uint8Array(videoBuffer))

    // 2. Extract audio using FFmpeg (requires FFmpeg layer or WebAssembly)
    const tempAudioPath = `/tmp/${crypto.randomUUID()}.mp3`
    // ... FFmpeg extraction logic ...

    // 3. Upload audio to storage
    const audioFile = await Deno.readFile(tempAudioPath)
    const audioStoragePath = `${videoPath.split('/')[0]}/audio_${Date.now()}.mp3`
    await supabase.storage.from('lesson-videos').upload(audioStoragePath, audioFile)

    // 4. Cleanup
    await Deno.remove(tempVideoPath)
    await Deno.remove(tempAudioPath)

    return audioStoragePath
    */
  } catch (error: any) {
    console.error('[Audio Extraction] Error:', error)
    throw new Error(`Audio extraction failed: ${error.message}`)
  }
}

/**
 * Compress audio file to reduce size and cost
 * NOTE: Similar FFmpeg constraints as extractAudio()
 * Current implementation skips compression and returns original path
 */
async function compressAudio(
  supabase: any,
  audioPath: string
): Promise<{ path: string; size_mb: number }> {
  try {
    // For production: Implement FFmpeg compression or use external service
    console.log('[Audio Compression] Skipping compression - using original file')

    // Estimate size (will be updated with actual file size in production)
    return {
      path: audioPath,
      size_mb: 10 // Placeholder estimate
    }

    /* Production implementation would look like:
    const { data: { signedUrl } } = await supabase.storage
      .from('lesson-videos')
      .createSignedUrl(audioPath, 3600)

    const response = await fetch(signedUrl)
    const audioBuffer = await response.arrayBuffer()
    const tempInputPath = `/tmp/${crypto.randomUUID()}.mp3`
    await Deno.writeFile(tempInputPath, new Uint8Array(audioBuffer))

    // Compress using FFmpeg: reduce to 16kHz, 64kbps
    const tempOutputPath = `/tmp/${crypto.randomUUID()}_compressed.mp3`
    // ... FFmpeg compression logic ...

    const compressedFile = await Deno.readFile(tempOutputPath)
    const compressedStoragePath = audioPath.replace('.mp3', '_compressed.mp3')
    await supabase.storage.from('lesson-videos').upload(compressedStoragePath, compressedFile)

    const sizeMB = compressedFile.byteLength / (1024 * 1024)

    await Deno.remove(tempInputPath)
    await Deno.remove(tempOutputPath)

    return {
      path: compressedStoragePath,
      size_mb: Number(sizeMB.toFixed(2))
    }
    */
  } catch (error: any) {
    console.error('[Audio Compression] Error:', error)
    throw new Error(`Audio compression failed: ${error.message}`)
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(
  supabase: any,
  audioPath: string,
  apiKey: string
): Promise<TranscriptionResult> {
  try {
    console.log('[Whisper API] Starting transcription...')

    // 1. Download audio/video file from storage
    const { data: { signedUrl }, error: urlError } = await supabase.storage
      .from('lesson-videos')
      .createSignedUrl(audioPath, 3600)

    if (urlError || !signedUrl) {
      throw new Error(`Failed to create signed URL: ${urlError?.message}`)
    }

    // 2. Download file
    const response = await fetch(signedUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }

    const audioBuffer = await response.arrayBuffer()
    const audioSizeMB = audioBuffer.byteLength / (1024 * 1024)

    console.log(`[Whisper API] File size: ${audioSizeMB.toFixed(2)}MB`)

    // 3. Check file size limit (Whisper API: 25MB max)
    if (audioSizeMB > 25) {
      throw new Error(`File too large: ${audioSizeMB.toFixed(2)}MB (max 25MB). Please implement audio compression.`)
    }

    // 4. Prepare FormData for Whisper API
    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer]), 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('language', 'ko') // Korean language
    formData.append('response_format', 'json')

    // 5. Call Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      throw new Error(`Whisper API error (${whisperResponse.status}): ${errorText}`)
    }

    const result = await whisperResponse.json()

    // 6. Calculate cost (Whisper pricing: $0.006 per minute)
    // Estimate minutes based on file size (rough: 1MB ≈ 2 minutes of audio)
    const estimatedMinutes = audioSizeMB * 2
    const cost = estimatedMinutes * 0.006

    // 7. Estimate tokens (rough: 4 characters per token)
    const tokensUsed = Math.floor(result.text.length / 4)

    console.log(`[Whisper API] Transcription complete: ${result.text.length} chars, ~${tokensUsed} tokens`)

    return {
      transcript: result.text,
      tokens_used: tokensUsed,
      cost_usd: Number(cost.toFixed(4))
    }
  } catch (error: any) {
    console.error('[Whisper API] Error:', error)
    throw new Error(`Transcription failed: ${error.message}`)
  }
}

/**
 * Generate feedback using GPT-4 or Claude
 */
async function generateFeedback(
  transcript: string,
  apiKey: ApiKey
): Promise<FeedbackResult> {
  if (apiKey.api_key_type === 'openai') {
    return await generateFeedbackGPT4(transcript, apiKey.encrypted_api_key)
  } else if (apiKey.api_key_type === 'anthropic') {
    return await generateFeedbackClaude(transcript, apiKey.encrypted_api_key)
  } else {
    throw new Error(`Unsupported API key type: ${apiKey.api_key_type}`)
  }
}

/**
 * Generate feedback using GPT-4 API
 */
async function generateFeedbackGPT4(
  transcript: string,
  apiKey: string
): Promise<FeedbackResult> {
  try {
    console.log('[GPT-4 API] Generating feedback...')

    const systemPrompt = `You are an expert language teacher analyzing a lesson transcript. Provide a structured analysis in JSON format with the following fields:

{
  "summary": "A concise lesson summary in 2-3 sentences (in Korean)",
  "strengths": ["2-4 specific student strengths (in Korean)"],
  "weaknesses": ["2-4 specific areas for improvement (in Korean)"],
  "homework": {
    "title": "Homework title (in Korean)",
    "description": "Detailed homework description (in Korean)",
    "difficulty": "beginner|intermediate|advanced",
    "focus_areas": ["2-3 specific focus areas (in Korean)"]
  }
}

Important: Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.`

    const userPrompt = `Analyze this lesson transcript and provide structured feedback:\n\n${transcript}`

    // Call GPT-4 API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // or 'gpt-4-1106-preview'
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
      const errorText = await response.text()
      throw new Error(`GPT-4 API error (${response.status}): ${errorText}`)
    }

    const result = await response.json()

    // Parse feedback JSON
    const feedbackContent = result.choices[0].message.content
    const feedback = JSON.parse(feedbackContent)

    // Calculate cost (GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens)
    const inputTokens = result.usage.prompt_tokens
    const outputTokens = result.usage.completion_tokens
    const cost = (inputTokens / 1000) * 0.01 + (outputTokens / 1000) * 0.03

    console.log(`[GPT-4 API] Feedback generated: ${result.usage.total_tokens} tokens, $${cost.toFixed(4)}`)

    return {
      summary: feedback.summary,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      homework: feedback.homework,
      tokens_used: result.usage.total_tokens,
      cost_usd: Number(cost.toFixed(4))
    }
  } catch (error: any) {
    console.error('[GPT-4 API] Error:', error)
    throw new Error(`GPT-4 feedback generation failed: ${error.message}`)
  }
}

/**
 * Generate feedback using Claude API
 */
async function generateFeedbackClaude(
  transcript: string,
  apiKey: string
): Promise<FeedbackResult> {
  try {
    console.log('[Claude API] Generating feedback...')

    const systemPrompt = `You are an expert language teacher analyzing a lesson transcript. Provide a structured analysis in JSON format with these exact fields:

{
  "summary": "A concise lesson summary in 2-3 sentences (in Korean)",
  "strengths": ["2-4 specific student strengths (in Korean)"],
  "weaknesses": ["2-4 specific areas for improvement (in Korean)"],
  "homework": {
    "title": "Homework title (in Korean)",
    "description": "Detailed homework description (in Korean)",
    "difficulty": "beginner|intermediate|advanced",
    "focus_areas": ["2-3 specific focus areas (in Korean)"]
  }
}

Respond ONLY with valid JSON. No markdown, no explanations.`

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze this lesson transcript and provide structured feedback:\n\n${transcript}`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API error (${response.status}): ${errorText}`)
    }

    const result = await response.json()

    // Extract feedback from Claude response
    const feedbackContent = result.content[0].text

    // Remove markdown code blocks if present
    let cleanedContent = feedbackContent
    if (cleanedContent.includes('```json')) {
      cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    }

    const feedback = JSON.parse(cleanedContent)

    // Calculate cost (Claude Opus: $15 per 1M input tokens, $75 per 1M output tokens)
    const inputTokens = result.usage.input_tokens
    const outputTokens = result.usage.output_tokens
    const cost = (inputTokens / 1000000) * 15 + (outputTokens / 1000000) * 75

    const totalTokens = inputTokens + outputTokens

    console.log(`[Claude API] Feedback generated: ${totalTokens} tokens, $${cost.toFixed(4)}`)

    return {
      summary: feedback.summary,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      homework: feedback.homework,
      tokens_used: totalTokens,
      cost_usd: Number(cost.toFixed(4))
    }
  } catch (error: any) {
    console.error('[Claude API] Error:', error)
    throw new Error(`Claude feedback generation failed: ${error.message}`)
  }
}
