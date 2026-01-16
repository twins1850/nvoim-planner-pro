// ============================================================================
// Edge Function: audio-processor
// Purpose: Process student audio homework submissions with AI analysis
// Flow: Audio → Azure STT → OpenAI Feedback → Database Storage
// IMPORTANT: Uses planner's individual API keys (not shared keys)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface ApiKey {
  id: string
  api_key_type: string
  encrypted_api_key: string
  encryption_iv: string
  key_name: string
}

// ============================================================================
// API Key Decryption Utility (same as analyze-lesson-video)
// ============================================================================

async function decryptApiKey(encryptedKey: string, iv: string): Promise<string> {
  try {
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

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error: any) {
    console.error('[Decryption Error]:', error)
    throw new Error(`Failed to decrypt API key: ${error.message}`)
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ========================================================================
    // Step 1: Parse Input
    // ========================================================================
    const { submissionId, fileUrl } = await req.json()
    if (!submissionId || !fileUrl) {
      throw new Error('Missing submissionId or fileUrl')
    }

    console.log(`[Step 1] Processing submission: ${submissionId}`)

    // ========================================================================
    // Step 2: Initialize Supabase Client
    // ========================================================================
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ========================================================================
    // Step 3: Get Student and Planner Info
    // ========================================================================
    console.log('[Step 3] Fetching student and planner info...')

    // Get submission to find student_id
    const { data: submission, error: submissionError } = await supabaseClient
      .from('homework_submissions')
      .select('student_id')
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionId}`)
    }

    // Get student's planner_id
    const { data: student, error: studentError } = await supabaseClient
      .from('student_profiles')
      .select('planner_id')
      .eq('id', submission.student_id)
      .single()

    if (studentError || !student || !student.planner_id) {
      throw new Error(`Student or planner not found for student: ${submission.student_id}`)
    }

    const plannerId = student.planner_id
    console.log(`[Step 3] Planner ID: ${plannerId}`)

    // ========================================================================
    // Step 4: Get Planner's API Keys
    // ========================================================================
    console.log('[Step 4] Loading planner API keys...')

    const { data: apiKeys, error: apiKeyError } = await supabaseClient
      .from('planner_api_keys')
      .select('*')
      .eq('planner_id', plannerId)
      .eq('is_active', true)

    if (apiKeyError || !apiKeys || apiKeys.length === 0) {
      throw new Error('No active API keys found for this planner. Please register API keys in settings.')
    }

    const keys = apiKeys as ApiKey[]
    console.log(`[Step 4] Found ${keys.length} active API keys`)

    // Find required API keys
    const openaiKey = keys.find(k => k.api_key_type === 'openai')
    const azureKey = keys.find(k => k.api_key_type === 'azure')

    if (!openaiKey) {
      throw new Error('OpenAI API key required. Please register in settings.')
    }

    if (!azureKey) {
      throw new Error('Azure Speech API key required. Please register in settings.')
    }

    // Decrypt API keys
    console.log('[Step 4] Decrypting API keys...')
    const decryptedOpenaiKey = await decryptApiKey(
      openaiKey.encrypted_api_key,
      openaiKey.encryption_iv
    )
    const decryptedAzureKey = await decryptApiKey(
      azureKey.encrypted_api_key,
      azureKey.encryption_iv
    )

    // Azure region is typically stored in key_name or separate field
    // For now, default to koreacentral (can be enhanced later)
    const azureRegion = 'koreacentral'

    // ========================================================================
    // Step 5: Download Audio File
    // ========================================================================
    console.log('[Step 5] Downloading audio file...')

    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`)
    }
    const audioBuffer = await fileResponse.arrayBuffer()

    console.log(`[Step 5] Downloaded ${audioBuffer.byteLength} bytes`)

    // ========================================================================
    // Step 6: Azure Speech-to-Text
    // ========================================================================
    console.log('[Step 6] Calling Azure Speech API...')

    const azureUrl = `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`

    const azureResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': decryptedAzureKey,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Accept': 'application/json'
      },
      body: audioBuffer
    })

    if (!azureResponse.ok) {
      const errText = await azureResponse.text()
      console.error('[Step 6] Azure STT Error:', errText)
      throw new Error(`Azure STT Failed: ${azureResponse.status} ${azureResponse.statusText}`)
    }

    const azureData = await azureResponse.json()
    const transcript = azureData.DisplayText || azureData.text || ''

    console.log('[Step 6] Transcript:', transcript)

    // ========================================================================
    // Step 7: OpenAI GPT-4 Analysis
    // ========================================================================
    console.log('[Step 7] Calling OpenAI API...')

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedOpenaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert English tutor. Analyze the student's spoken sentence.
Return a JSON object with:
- "score" (0-100 integer based on grammar and clarity)
- "corrections" (array of strings, specific fixes)
- "better_expressions" (array of strings, native-like alternatives)
- "positive_feedback" (string)
- "areas_for_improvement" (string)
JSON ONLY.`
          },
          {
            role: 'user',
            content: `Student said: "${transcript}"`
          }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!gptResponse.ok) {
      const errText = await gptResponse.text()
      console.error('[Step 7] OpenAI Error:', errText)
      throw new Error(`OpenAI Failed: ${gptResponse.status}`)
    }

    const gptData = await gptResponse.json()
    const aiAnalysis = JSON.parse(gptData.choices[0].message.content)

    console.log('[Step 7] AI Analysis completed')

    // ========================================================================
    // Step 8: Save to Database (Optional - depends on your schema)
    // ========================================================================
    // Note: You may want to update homework_submissions or create feedback record
    // This depends on your existing schema structure

    // ========================================================================
    // Step 9: Return Success Response
    // ========================================================================
    console.log('[Complete] Audio processing finished successfully')

    return new Response(
      JSON.stringify({
        success: true,
        transcript,
        analysis: aiAnalysis,
        planner_id: plannerId,
        message: 'Processed using planner\'s individual API keys'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('[Error]:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Audio processing failed. Please check API keys in settings.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
