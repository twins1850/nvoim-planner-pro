# 🚀 Edge Function Deployment Guide

## ✅ Completed Tasks

### 1. Supabase Secrets Configuration (COMPLETED)
The following API keys have been successfully configured in Supabase Dashboard:
- ✅ `OPENAI_API_KEY` - GPT-4o API access
- ✅ `AZURE_SPEECH_KEY` - Azure Speech Services
- ✅ `AZURE_SPEECH_REGION` - koreacentral

### 2. Edge Function Code (READY)
The `audio-processor` function code is ready at:
- Location: `/supabase/functions/audio-processor/index.ts`
- Purpose: Process audio submissions with AI (STT + GPT-4o analysis)

## 📋 Deployment Instructions

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to [Edge Functions](https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/functions)
2. Click "Open Editor"
3. Name the function: `audio-processor`
4. Copy the entire content from `/supabase/functions/audio-processor/index.ts`
5. Paste into the editor
6. Click "Deploy function"

### Option 2: Via Supabase CLI
```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login with access token
supabase login --token YOUR_ACCESS_TOKEN

# 3. Link to project
supabase link --project-ref ybcjkdcdruquqrdahtga

# 4. Deploy the function
supabase functions deploy audio-processor
```

### Option 3: Via GitHub Actions (Future)
Once the repository is connected to GitHub, automatic deployment can be set up.

## 🔧 Function Details

### Endpoint
Once deployed, the function will be accessible at:
```
https://ybcjkdcdruquqrdahtga.supabase.co/functions/v1/audio-processor
```

### Request Format
```json
{
  "submissionId": "uuid",
  "fileUrl": "https://storage-url/audio-file.wav"
}
```

### Response Format
```json
{
  "success": true,
  "transcript": "Student's spoken text",
  "analysis": {
    "score": 85,
    "corrections": ["correction 1", "correction 2"],
    "better_expressions": ["native expression 1"],
    "positive_feedback": "Great pronunciation!",
    "areas_for_improvement": "Work on intonation"
  }
}
```

## ⚠️ Important Notes

1. **Manual Deployment Required**: The function needs to be manually deployed via the Supabase Dashboard or CLI
2. **Secrets Already Set**: All required API keys are already configured
3. **CORS Enabled**: The function includes CORS headers for browser access
4. **Error Handling**: The function includes comprehensive error handling

## 🧪 Testing the Function

After deployment, test with:
```bash
curl -X POST https://ybcjkdcdruquqrdahtga.supabase.co/functions/v1/audio-processor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "submissionId": "test-id",
    "fileUrl": "https://your-audio-file-url"
  }'
```

## 📝 Next Steps

1. Deploy the function manually via Dashboard
2. Test with a sample audio file
3. Integrate with the Student App
4. Build the feedback visualization UI (Phase 3)

---

*Last Updated: January 2, 2025*