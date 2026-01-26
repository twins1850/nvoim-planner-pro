# Phase 1 Progress Report: Business Logic & Connection Structure

## Status Overview
**Status:** 🟡 In Progress
**Started:** 2026-01-02
**Goal:** Implement subscription billing model and secure student-planner connection logic.

## 1. Database Schema Updates
**Done:**
- [x] Created `subscriptions` table.
    - Fields: `plan_type` (free/basic/pro), `status`, `max_students`, `current_period_end`.
- [x] Updated `planner_profiles` table.
    - Added `invite_code` (unique text) for student onboarding.
    - Added `is_accepting_students` flag.
- [x] Implemented Security Logic (RLS & RPC).
    - `link_student_to_planner(code)`: Secure Postgres function to:
        1. Validate invite code.
        2. **Check Subscription Limit** (e.g., max 10 students).
        3. Link student to planner if passed.
- [x] Created Migration File: `supabase/migrations/20250102_init_subscription.sql`.
- [x] Updated Master Schema: `supabase/schema.sql`.

## 2. Next Steps (Action Items)
1. **Frontend Implementation (Web - Planner)**
    - Add "Subscriptions" page to Dashboard.
    - Display "Invite Code" and "Current Student Count / Max Limit".
    - (Mock) Payment button to upgrade plan.
2. **Frontend Implementation (App - Student)**
    - Add "Connect to Planner" screen on first login.
    - Input field for `invite_code`.
    - Call `link_student_to_planner` RPC function.

## 3. Technical Notes
- The `link_student_to_planner` function is the gatekeeper. It enforces the business rule (10 students max) at the database level, preventing logic bypass.
- To test this, we need to:
    1. Manually insert a `subscriptions` record for a test planner.
    2. Set a test `invite_code` for that planner.
    3. Try to link a student account using that code.
