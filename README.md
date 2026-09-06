# Faculty OS

> **Automated academic quality & audit system for university faculty and curriculum leads.**

Faculty OS helps educators audit course assessments and curricula in minutes. Paste Course Learning Outcomes (CLOs), draft exam questions, past exam archives, or course syllabi to instantly generate structured AI audits: untested learning outcomes, accidental question recycling, curriculum overlap, and grading inconsistencies.

---

## 🌐 Live Deployments & Links

- **Production URL**: [https://facultyos-rho.vercel.app](https://facultyos-rho.vercel.app)
- **Alternative Mirror**: [https://facultyos-hrittikaaas-projects.vercel.app](https://facultyos-hrittikaaas-projects.vercel.app)
- **Source Repository**: [https://github.com/shads-01/FacultyOS](https://github.com/shads-01/FacultyOS)

---

## ⚡ Key Features

| Feature | Description | Endpoint | Persistence |
| :--- | :--- | :--- | :--- |
| **Exam Quality & CLO Coverage** | Maps questions against Bloom's Taxonomy & CLOs, identifies unassessed outcomes, and detects recycled questions with similarity scoring. | `POST /api/analyze` | ✅ Stored in Supabase |
| **Audit Run History** | Review historical exam analyses, coverage rates, and detected question recycling over time. | `GET /api/runs` | ✅ Stored in Supabase |
| **Syllabus & Curriculum Overlap** | Compares proposed course topics against existing departmental syllabi to flag redundancy and missing foundational prerequisites. | `POST /api/overlap` | Stateless |
| **Multi-Grader Consistency** | Audits scoring distribution across multiple graders/TAs to catch harsh/lenient scoring anomalies. | `POST /api/grader-consistency` | Stateless |
| **AI-Anchored Rubric Scoring** | Evaluates student submissions against scoring rubrics and model solutions, tracking grading discrepancies. | `POST /api/grade` | Stateless |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, `src/` layout)
- **UI & Runtime**: [React 19](https://react.dev/), TypeScript + JavaScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (New York style), [Lucide React](https://lucide.dev/)
- **Animations**: [GSAP](https://gsap.com/) (curated reveal transitions)
- **AI Engine**: [Google Gemini](https://ai.google.dev/) (`gemini-2.5-flash` / `gemini-3.6-flash`) via native `fetch` with automated multi-key rotation on HTTP 429
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, `@supabase/ssr` cookie-based auth sessions)
- **Testing**: Built-in Node.js Test Runner (`node:test`) — 56 passing unit & contract tests, zero external testing dependencies
- **Hosting**: [Vercel](https://vercel.com/) (Edge / Serverless)

---

## 📂 Project Structure

```text
carnival-hackathon-8.0/
├── fixtures/                  # Example payloads for all 4 audit features
│   ├── analyze-example.json
│   ├── grade-example.json
│   ├── grader-consistency-example.json
│   └── overlap-example.json
├── lib/                       # Pure logic, prompts, and parsers (tested by node:test)
│   ├── analyze.js             # CLO parsing, prompt builders, and Bloom extraction
│   ├── gemini.js              # Native Gemini client with API key rotation on 429
│   ├── grade.js               # Rubric scoring & delta computation
│   ├── graderConsistency.js   # Grader anomaly flags & score matrix parsing
│   ├── overlap.js             # Syllabus topic grouping and overlap analysis
│   └── supabase/              # SSR server/client helpers for Supabase Auth
├── public/                    # Static assets
├── scripts/                   # Integration & smoke test scripts
│   └── smoke-test.mjs         # End-to-end API smoke runner
├── src/
│   ├── app/
│   │   ├── (app)/             # Authenticated workspace views
│   │   │   ├── ai-grading/            # Screen: AI-Anchored Grading
│   │   │   ├── dashboard/             # Overview & quick launchpad
│   │   │   ├── exam-quality/          # Screen: Exam Quality & CLO Matrix
│   │   │   ├── grader-consistency/    # Screen: Multi-Grader Consistency
│   │   │   ├── history/               # Screen: Past Run History
│   │   │   ├── profile/               # User profile & session settings
│   │   │   └── syllabus-overlap/      # Screen: Syllabus Overlap Audit
│   │   ├── (auth)/            # Auth routes
│   │   │   ├── login/                 # Email & password login
│   │   │   └── signup/                # Direct signup (auto-confirmed)
│   │   ├── api/               # API route handlers
│   │   │   ├── analyze/               # POST /api/analyze
│   │   │   ├── grade/                 # POST /api/grade
│   │   │   ├── grader-consistency/    # POST /api/grader-consistency
│   │   │   ├── overlap/               # POST /api/overlap
│   │   │   └── runs/                  # GET /api/runs
│   │   ├── layout.tsx         # Root layout with font definitions & global theme
│   │   └── page.tsx           # Entry redirect
│   ├── components/            # Feature and UI components
│   │   ├── CoverageMatrix.jsx         # CLO coverage visualization grid
│   │   ├── ExamQualityReport.jsx      # Composite exam audit view
│   │   ├── GraderConsistencyTable.jsx # TA grading variance table
│   │   ├── GradingTable.jsx           # AI rubric comparison view
│   │   ├── NextActions.jsx            # Recommended curriculum fixes
│   │   ├── OverlapReport.jsx          # Duplicate syllabus topics & gaps
│   │   ├── RecycledList.jsx           # Past exam question recycling list
│   │   └── ui/                        # shadcn/ui components (buttons, cards, badges)
│   └── middleware.js          # Supabase auth session refresh & route protection
├── supabase/
│   └── migrations/
│       └── 0001_init.sql      # Database schema with RLS policies
└── test/                      # Pure-logic test suite (run via node:test)
    ├── analyze.test.js
    ├── api.test.js
    ├── gemini.test.js
    ├── grade.test.js
    ├── graderConsistency.test.js
    ├── nextActions.test.js
    ├── overlap.test.js
    └── reportTransforms.test.js
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.x or higher (tested on Node v20/v24)
- **npm**: v10+
- A [Supabase](https://supabase.com/) project (with Email Auth enabled)
- A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/shads-01/FacultyOS.git
cd FacultyOS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the sample environment file to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the following variables in `.env.local`:

```ini
# Google Gemini API Key(s)
# Tip: Supports comma-separated keys for automatic rate-limit rotation (HTTP 429)
GEMINI_API_KEY=AIzaSy...your_gemini_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your_anon_key

# Server-only (optional / administrative)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your_service_role_key
```

### 4. Database Setup

In your Supabase project's **SQL Editor**, execute the migration file located at:

```text
supabase/migrations/0001_init.sql
```

This creates the `analysis_runs` table and configures Row Level Security (RLS) policies allowing users to read and insert only their own audit records.

> **Auth Settings Tip**: In the Supabase Dashboard under **Authentication -> Providers -> Email**, disable *"Confirm email"* so signups log in immediately without requiring email verification.

### 5. Run the Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The repository uses Node's native test runner (`node:test`) for instant, dependency-free execution:

```bash
# Run all unit tests (56 tests across pure logic modules)
node --test test/*.test.js
```

### Smoke Test (Integration)

To test the live API endpoints against your local server or staging URL:

```bash
# Test local server
node scripts/smoke-test.mjs

# Test custom URL
SMOKE_TEST_URL=https://facultyos-rho.vercel.app node scripts/smoke-test.mjs
```

---

## 🚢 Production Build & Deployment

```bash
# Build production bundle
npm run build

# Start production server locally
npm run start
```

### Deploying to Vercel

Faculty OS deploys zero-config on Vercel:
1. Import the `shads-01/FacultyOS` repository in the Vercel dashboard.
2. Ensure the Framework Preset is set to **Next.js**.
3. Add the environment variables (`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy!

---

## 👥 Team

Built during the 5.5-hour Carnival Hackathon 8.0:
- **Arko**: Backend Core, Auth Architecture, Supabase & Exam Analysis Route
- **Shads**: Frontend Application, UI/UX Design System, Data Visualizations
- **Hrittika**: Secondary Analysis Routes (Overlap, Consistency, Grading), Fixtures & QA
