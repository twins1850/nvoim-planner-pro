# GEMINI.md

## Project Overview

**Project Name:** NVOIM English Planner Pro (앤보임 플래너 프로)

This project is a comprehensive English conversation management system consisting of a web application for planners (teachers/admins) and a mobile application for students. It utilizes Supabase as a unified backend for authentication, database, and storage.

### Architecture

*   **Planner Web App (`apps/planner-web`):** A Next.js 15 application for managing students, homework, and lessons.
*   **Student Mobile App (`apps/student`):** A React Native (Expo) application for students to view assignments, submit homework (audio/text), and track progress.
*   **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime).

## Building and Running

### Prerequisites

*   Node.js (v18+)
*   npm or yarn
*   Supabase project credentials

### Installation

To install dependencies for the root and all sub-projects:

```bash
npm run install:all
```

### Development

**Run all services concurrently (Root):**

```bash
npm run dev
```

**Planner Web App:**

```bash
cd apps/planner-web
npm run dev
```
*   Access at: `http://localhost:3000`

**Student Mobile App:**

```bash
cd apps/student
npx expo start
```
*   Run on iOS Simulator: `npx expo run:ios` (Mac only)
*   Run on Android Emulator: `npx expo run:android`
*   Run on Web: `npx expo start --web`

### Deployment

*   **Planner Web:** Deployed via Render (Next.js build).
*   **Student App:** Built via Expo (EAS or local build).
*   **Database:** Managed via Supabase. Schema is located in `supabase/schema.sql`.

## Development Conventions

*   **Language:** TypeScript is strictly used across all projects.
*   **Styling:**
    *   Web: Tailwind CSS (`@tailwindcss/postcss`).
    *   Mobile: React Native stylesheets / inline styles.
*   **State Management:**
    *   Web: Zustand + React Query.
*   **Database Interaction:**
    *   Uses `@supabase/supabase-js` and `@supabase/ssr`.
    *   Database types should be generated from the Supabase schema.
*   **Directory Structure:**
    *   `apps/`: Contains the frontend applications.
    *   `supabase/`: Contains database schema and types.
    *   `.kiro/specs/`: Contains project requirements and design documents.

## Key Files & Directories

*   `package.json` (Root): Orchestrates scripts for the monorepo.
*   `apps/planner-web/next.config.ts`: Configuration for the Next.js app.
*   `apps/student/app.json`: Configuration for the Expo app.
*   `supabase/schema.sql`: Source of truth for the database schema.
*   `SETUP_GUIDE.md`: Detailed instructions for setting up the environment.

## Notes

*   The student app directory is named `apps/student`, though some documentation may refer to it as `apps/student-mobile`.
*   Ensure environment variables (`.env.local` for web, `.env` for mobile) are correctly set up with Supabase credentials before running.
