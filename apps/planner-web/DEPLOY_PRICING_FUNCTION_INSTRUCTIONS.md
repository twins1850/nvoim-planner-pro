# 🚀 Deploy get_all_subscription_prices Function - Final Step

## ✅ What's Been Completed

1. **Fixed SQL Migration File** - The corrected SQL with NULL planner_id support is ready at:
   ```
   supabase/migrations/20260204_get_all_prices_function.sql
   ```

2. **Key Fix Applied**:
   - Changed `v_settings` from `planner_pricing_settings%ROWTYPE` to `RECORD` type
   - Added NULL check: `IF p_planner_id IS NOT NULL`
   - When NULL, uses default company margins (10% regular, 20% managed)
   - This allows querying company default prices without a specific planner

## 📋 Manual Deployment Steps (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql
2. Click on "Drop and recreate subscription price function" tab (already open in your browser)

### Step 2: Clear the Corrupted Content
1. Click in the SQL editor
2. Press `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac) to select all
3. Press `Delete` to clear

### Step 3: Copy the Correct SQL
1. Open the file: `supabase/migrations/20260204_get_all_prices_function.sql`
2. Select all content (`Ctrl+A` / `Cmd+A`)
3. Copy (`Ctrl+C` / `Cmd+C`)

### Step 4: Paste and Execute
1. Return to Supabase SQL Editor tab
2. Click in the empty editor
3. Paste (`Ctrl+V` / `Cmd+V`)
4. Click the green **"Run"** button
5. If prompted about "destructive operation", click **"Run this query"**

### Step 5: Verify Success
You should see:
```
Success. No rows returned
psql:/tmp/...:159: NOTICE: relation "get_all_subscription_prices" already exists, skipping
```

## 🧪 Test the Function

After deployment, test with this query in a new SQL Editor tab:

\`\`\`sql
-- Test with NULL planner_id (company default pricing)
SELECT * FROM get_all_subscription_prices(
    NULL,  -- planner_id
    '주3회'::subscription_frequency,
    '25분'::lesson_duration,
    '3개월'::payment_period,
    36  -- total_lessons
);
\`\`\`

Expected result should include:
- `success`: true
- `base_price`: 609000
- `regular`: object with cash_price, card_price, margins
- `managed`: object with cash_price, card_price, margins

## 📁 What Was Fixed

### Original Problem
```sql
-- This code caused NULL constraint violation:
SELECT * INTO v_settings
FROM public.planner_pricing_settings
WHERE planner_id = p_planner_id;

IF NOT FOUND THEN
    INSERT INTO public.planner_pricing_settings (planner_id)
    VALUES (p_planner_id)  -- ❌ Fails when p_planner_id is NULL
    RETURNING * INTO v_settings;
END IF;
```

### Fixed Solution
```sql
-- Now handles NULL planner_id correctly:
IF p_planner_id IS NOT NULL THEN
    SELECT * INTO v_settings
    FROM public.planner_pricing_settings
    WHERE planner_id = p_planner_id;

    IF NOT FOUND THEN
        INSERT INTO public.planner_pricing_settings (planner_id)
        VALUES (p_planner_id)
        RETURNING * INTO v_settings;
    END IF;
ELSE
    -- For company default pricing (NULL planner_id)
    SELECT false as use_custom_prices,
           10.00 as regular_margin_percent,
           20.00 as managed_margin_percent
    INTO v_settings;
END IF;
```

## 🎯 Next Steps After Deployment

Once the function is successfully deployed:

1. **Update AddSubscriptionForm.tsx** to call `get_all_subscription_prices`
2. **Display all three price tiers** simultaneously:
   - 원단가 (Base Price / Member Price)
   - 일반수강 (Regular) - Base + 10% margin
   - 관리수강 (Managed) - Base + 20% margin
3. **Show both payment methods**:
   - 현금 (Cash)
   - 카드 (Card) - Cash + 10%

## 📊 Function Return Structure

```json
{
  "success": true,
  "base_price": 609000,
  "regular": {
    "cash_price": 670000,
    "card_price": 737000,
    "per_lesson_price": 18611,
    "per_month_price": 223333,
    "margin": 61000,
    "margin_percent": 10.0,
    "available": true
  },
  "managed": {
    "cash_price": 731000,
    "card_price": 804000,
    "per_lesson_price": 20305,
    "per_month_price": 243667,
    "margin": 122000,
    "margin_percent": 20.0,
    "available": true
  },
  "is_custom": false,
  "total_lessons": 36,
  "months": 3
}
```

## 💡 Alternative Deployment Methods (If Manual Fails)

If manual copy-paste has issues, try:

### Option A: Use psql Command Line
```bash
# Get the password from your Supabase dashboard
psql "postgresql://postgres.ybcjkdcdruquqrdahtga:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20260204_get_all_prices_function.sql
```

### Option B: Use Supabase CLI (if Docker available)
```bash
supabase db push --linked
```

## ✅ Completion Checklist

- [ ] SQL copied from `supabase/migrations/20260204_get_all_prices_function.sql`
- [ ] Pasted into Supabase SQL Editor
- [ ] Executed successfully without errors
- [ ] Tested function with NULL planner_id
- [ ] Ready to proceed with Phase 4 frontend implementation

---

**Status**: Migration file ready, awaiting manual execution in Supabase SQL Editor.
**File**: `supabase/migrations/20260204_get_all_prices_function.sql`
**Next**: Copy-paste into SQL Editor and execute.
