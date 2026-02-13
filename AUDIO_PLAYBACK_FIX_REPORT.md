# Audio Playback Fix Report

## 🔍 Root Cause Analysis

### Primary Issue: Missing Storage Bucket
The `homework-submissions` storage bucket **was never created** in Supabase.

**Evidence**:
- Migration `024_homework_submissions_storage_policies.sql` created RLS policies for a bucket that doesn't exist
- Student app upload fails with error: `StorageApiError: new row violates row-level security policy`
- Console log shows: `Failed to load resource: the server responded with a status of 400`

### Secondary Issue: Incorrect Default Bucket in `getFileDownloadUrl()`
The planner app's `getFileDownloadUrl()` function defaults to the wrong bucket.

**Location**: `/apps/planner-web/src/lib/homework-api.ts:340`

**Current Code**:
```typescript
let bucket = 'homework-files'  // ❌ WRONG BUCKET!
```

**Should Be**:
```typescript
let bucket = 'homework-submissions'  // ✅ CORRECT
```

---

## ✅ Solutions Implemented

### Solution 1: Create the Missing Storage Bucket

**File**: `/supabase/migrations/025_create_homework_submissions_bucket.sql` ✅ **CREATED**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-submissions',
  'homework-submissions',
  false,  -- NOT public - requires signed URLs
  52428800,  -- 50MB max
  ARRAY['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/wav', ...]
)
ON CONFLICT (id) DO UPDATE SET ...;
```

**Status**: Migration file created, needs to be applied to database.

---

### Solution 2: Fix `getFileDownloadUrl()` Default Bucket

**File**: `/apps/planner-web/src/lib/homework-api.ts`

**Change Required**:
- Line 340: Change `let bucket = 'homework-files'` → `let bucket = 'homework-submissions'`

---

## 🎯 Deployment Steps (Manual)

### Step 1: Apply Migration to Supabase

**Option A: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/editor
2. Open SQL Editor
3. Run the SQL from `/supabase/migrations/025_create_homework_submissions_bucket.sql`

**Option B: Via Supabase CLI** (if Docker is running)
```bash
npx supabase db reset
```

**Option C: Direct SQL Execution**
```bash
npx supabase db push
```

### Step 2: Fix Planner App Code

1. Edit `/apps/planner-web/src/lib/homework-api.ts`
2. Line 340: Change default bucket to `'homework-submissions'`
3. Restart planner app: `npm run dev` (in apps/planner-web)

### Step 3: Verify Fix

1. Open student app: http://localhost:10000
2. Record and submit audio homework
3. Open planner app: http://localhost:3000/homework/[homework-id]
4. Verify audio player displays and plays successfully
5. Check browser console for errors

---

## 📊 Test Results (Before Fix)

### Student App (localhost:10000)
- ❌ Audio upload failed: `StorageApiError: new row violates row-level security policy`
- ❌ Submission data contains blob URL instead of Storage path
- ❌ HTTP 400 error when uploading to Storage

### Planner App (localhost:3000)
- ❌ Audio player not rendered (audioCount = 0)
- ❌ Multiple error dialogs: "파일 다운로드 URL 생성 실패: Invalid key"
- ❌ `getFileDownloadUrl()` fails because bucket doesn't exist

---

## 🎯 Expected Results (After Fix)

### Student App
- ✅ Audio file uploads successfully to `homework-submissions` bucket
- ✅ File path: `{user_id}/{homework_id}/audio_xxx.mp4`
- ✅ Public URL saved to database: `https://...supabase.co/storage/v1/object/public/homework-submissions/...`
- ✅ No console errors

### Planner App
- ✅ Audio player renders with controls
- ✅ Signed URL generated successfully
- ✅ Audio file streams and plays
- ✅ No error dialogs
- ✅ Download button works

---

## 🔬 Technical Details

### File Upload Flow (Corrected)
```
1. Student records audio → blob URL created
2. Student clicks submit
3. Fetch blob data from blob URL
4. Upload to Supabase Storage: homework-submissions/{user_id}/{homework_id}/audio_xxx.mp4
5. Get public URL: https://...supabase.co/storage/v1/object/public/homework-submissions/...
6. Save public URL to database (submission_audio_url column)
7. Planner app reads public URL from database
8. getFileDownloadUrl() generates signed URL for secure access
9. Audio element uses signed URL for playback
```

### RLS Policy Verification
The RLS policies in `024_homework_submissions_storage_policies.sql` are **correct**:
- ✅ Students can upload to own folder: `(storage.foldername(name))[1] = auth.uid()::text`
- ✅ Students can read own files
- ✅ Planners can read all submissions (for grading)

The policies just couldn't work because the bucket didn't exist!

---

## 🚨 Critical Next Steps

1. **URGENT**: Apply migration 025 to create the bucket
2. **REQUIRED**: Fix default bucket in `getFileDownloadUrl()`
3. **RECOMMENDED**: Re-test audio submission end-to-end
4. **OPTIONAL**: Add error handling for missing bucket in future

---

## 📝 Additional Notes

### Why This Wasn't Caught Earlier
- Migration 024 created policies without creating the bucket
- No automated tests for Storage bucket existence
- RLS error message was misleading (said "policy violation" instead of "bucket not found")

### Prevention for Future
- Add migration validation: check bucket exists before creating policies
- Add integration tests that verify Storage buckets exist
- Improve error messages in `getFileDownloadUrl()` to distinguish bucket errors

---

**Report Generated**: 2026-02-12
**Agent**: dev-backend
**Status**: Fixes identified, migration created, awaiting deployment
