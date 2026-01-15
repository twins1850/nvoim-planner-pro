// ============================================================================
// Edge Function: manage-api-keys
// Purpose: Securely encrypt/decrypt API keys using AES-GCM
// Security: Uses environment variable encryption key, never exposes plaintext keys
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface EncryptRequest {
  action: 'encrypt' | 'decrypt'
  apiKey?: string  // For encryption
  encryptedKey?: string  // For decryption
  iv?: string  // For decryption
}

interface EncryptedResult {
  encryptedKey: string
  iv: string
}

// ============================================================================
// Encryption/Decryption Utilities
// ============================================================================

/**
 * Get encryption key from environment variable
 * Format: Base64-encoded 256-bit key
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = Deno.env.get('API_KEY_ENCRYPTION_KEY')

  if (!keyBase64) {
    throw new Error('API_KEY_ENCRYPTION_KEY environment variable not set')
  }

  // Decode base64 to Uint8Array
  const binaryString = atob(keyBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

/**
 * Encrypt API key using AES-GCM
 * @param apiKey - Plaintext API key
 * @returns Object with encrypted key and IV in base64
 */
async function encryptApiKey(apiKey: string): Promise<EncryptedResult> {
  // Get encryption key
  const keyData = getEncryptionKey()

  // Import key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // Generate random IV (Initialization Vector)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encode plaintext API key
  const encoder = new TextEncoder()
  const plaintext = encoder.encode(apiKey)

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintext
  )

  // Convert to base64 for storage
  const encryptedArray = new Uint8Array(encrypted)
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray))
  const ivBase64 = btoa(String.fromCharCode(...iv))

  return {
    encryptedKey: encryptedBase64,
    iv: ivBase64
  }
}

/**
 * Decrypt API key using AES-GCM
 * @param encryptedKey - Base64-encoded encrypted API key
 * @param iv - Base64-encoded IV
 * @returns Decrypted API key
 */
async function decryptApiKey(encryptedKey: string, iv: string): Promise<string> {
  // Get encryption key
  const keyData = getEncryptionKey()

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
}

// ============================================================================
// HTTP Response Helpers
// ============================================================================

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function errorResponse(message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    }
  )
}

function successResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    }
  )
}

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: getCorsHeaders() })
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // Parse request
    const { action, apiKey, encryptedKey, iv }: EncryptRequest = await req.json()

    if (!action) {
      return errorResponse('action is required (encrypt or decrypt)')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Authorization header required', 401)
    }

    // Initialize Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse('Supabase environment variables not configured', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user from auth token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return errorResponse('Invalid authentication token', 401)
    }

    // Handle encryption
    if (action === 'encrypt') {
      if (!apiKey) {
        return errorResponse('apiKey is required for encryption')
      }

      const result = await encryptApiKey(apiKey)

      return successResponse({
        success: true,
        encryptedKey: result.encryptedKey,
        iv: result.iv
      })
    }

    // Handle decryption
    if (action === 'decrypt') {
      if (!encryptedKey || !iv) {
        return errorResponse('encryptedKey and iv are required for decryption')
      }

      const decryptedKey = await decryptApiKey(encryptedKey, iv)

      return successResponse({
        success: true,
        apiKey: decryptedKey
      })
    }

    return errorResponse('Invalid action. Must be encrypt or decrypt')

  } catch (error) {
    console.error('Error in manage-api-keys function:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
