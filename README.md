# UniPulse

A student acquisition, registration, demand-monitoring, and community-management
platform for university students. Built with **React + Tailwind + Supabase**.

This README assumes you've never deployed anything before. Follow it top to
bottom in order — don't skip steps.

---

## What you're setting up

- **Supabase** — your database, authentication, and backend logic (free tier is enough to start)
- **Vercel** — hosts the website for free and gives you a live URL
- **GitHub** — stores your code so Vercel can deploy it

Total time: about 20–30 minutes.

---

## Part 1 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (GitHub sign-in is easiest).
2. Click **New Project**.
   - **Name**: `unipulse` (or anything you like)
   - **Database password**: generate one and **save it somewhere safe** — you likely won't need it again, but don't lose it.
   - **Region**: pick the one closest to your users (e.g. London if UK-focused).
3. Wait 1–2 minutes for the project to finish provisioning.

### Run the database schema

4. In the left sidebar, click the **SQL Editor** icon (looks like `>_`).
5. Click **New query**.
6. Open the file `supabase/schema.sql` from this repo, copy **the entire file**, paste it into the SQL Editor.
7. Click **Run** (bottom right, or `Ctrl/Cmd + Enter`).
   - You should see "Success. No rows returned." If you see an error, read it carefully — most likely a partial paste. Clear the editor and paste again.

### Load the seed data (147 universities)

8. Click **New query** again.
9. Open `supabase/seed.sql`, copy the entire file, paste it in, click **Run**.
   - This inserts all 147 universities from the brief (UK, Canada, Australia, US) with a default threshold of 5 registrations. Every field that would need a real statistic (student population, international %, etc.) is deliberately left blank — we never fabricate numbers. Fill these in later from the admin dashboard as you gather real data from HESA / IRCC-StatCan / Australian Dept of Education / IIE Open Doors-IPEDS, and each university's opportunity score recalculates automatically.

### Get your API keys

10. In the left sidebar, click **Project Settings** (gear icon) → **API**.
11. You'll need two values from this page:
    - **Project URL** (looks like `https://abcdefgh.supabase.co`)
    - **anon public** key (a long string under "Project API keys")
12. Keep this tab open — you'll paste these into two places shortly.

### Create your admin login

You (the founder/admin) need an account to access `/admin`. Registered students never get accounts — only you.

13. In the left sidebar, click **Authentication** → **Users**.
14. Click **Add user** → **Create new user**.
15. Enter your email and a password. Leave "Auto Confirm User" checked.
16. Click **Create user**.

That's it — this email + password is how you'll log into `/admin/login` once the site is live. You can add more admin users the same way later.

---

## Part 2 — Run it locally (recommended before deploying)

You'll need [Node.js](https://nodejs.org) installed (version 18 or later — the LTS download is fine).

1. Unzip this project and open a terminal inside the folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` in any text editor and paste in your two Supabase values from Part 1:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open the URL it prints (usually `http://localhost:5173`).

You should see the UniPulse homepage. Try registering as a test student, then go to `http://localhost:5173/admin/login` and sign in with the admin account you created in step 13–16 above — you should see your test registration in the Overview and Students tabs.

---

## Part 3 — Push the code to GitHub

Vercel deploys from a GitHub repository, so your code needs to live there first.

1. Go to [github.com](https://github.com) and sign in (or sign up).
2. Click the **+** icon top-right → **New repository**.
3. Name it `unipulse`, leave it **Private** (recommended, since seed data and structure are visible), don't initialize with a README (you already have one). Click **Create repository**.
4. Back in your terminal, inside the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: UniPulse"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/unipulse.git
   git push -u origin main
   ```
   Replace `YOUR-USERNAME` with your actual GitHub username. If prompted, sign in via the browser window that opens.

   Your `.env` file will **not** be pushed (it's excluded by `.gitignore`) — that's intentional, it contains your keys.

---

## Part 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up using your **GitHub account** (this makes the next step much easier).
2. Click **Add New…** → **Project**.
3. Find your `unipulse` repository in the list and click **Import**.
4. Vercel will auto-detect it's a Vite project. Leave the build settings as default:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
5. Before clicking Deploy, expand **Environment Variables** and add both:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL from Part 1 |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key from Part 1 |
6. Click **Deploy**. Wait 1–2 minutes.
7. You'll get a live URL like `https://unipulse-yourname.vercel.app` — this is your production site.

### Whenever you make changes later

Any time you push new commits to the `main` branch on GitHub, Vercel automatically rebuilds and redeploys — you don't need to repeat these steps.

---

## Part 5 — Using the admin dashboard

Go to `https://your-site.vercel.app/admin/login` and sign in with the admin account from Part 1.

- **Overview** — live totals, refreshes every 20 seconds.
- **Pipeline** — every university ranked by opportunity score. When a university crosses its registration threshold, a **Create community** button appears — click it, paste in the WhatsApp invite link once you've made the group, and its status flips to Active. The WhatsApp link is never shown to students directly; only admins can see or edit it.
- **Students** — every registration, with inline controls to mark verification/contact status, and a delete button for data-removal requests (GDPR/PIPEDA/Privacy Act compliance).
- **Course analytics** — what students are studying, filterable by university and date range, plus a suggested service to pitch each course category.
- **Export** — download a filtered CSV of registrations.

### Editing a university's real data

Registration counts and community status update automatically as students sign up. To add real statistics (which drive the auto-calculated opportunity score), open **Table Editor → universities** directly in Supabase and fill in fields like `est_total_students`, `international_pct`, `postgrad_population`, and set `data_confidence` to `verified` or `estimated` accordingly. Never guess a number — if you don't have it, leave it blank.

### Adjusting a university's threshold

Also done from **Table Editor → universities** in Supabase — edit `community_threshold` for any row. It defaults to 5 for every seeded university.

---

## How the "live" feeling works

The brief calls for a live-feeling homepage without building real-time infrastructure. This build polls Supabase every 20–30 seconds (see `src/components/LiveTicker.tsx` and `src/hooks/usePoll.ts`) rather than opening a websocket — it looks identical to a visitor, costs nothing extra to run, and there's nothing to configure. If you later want true real-time updates, Supabase Realtime can be swapped in without changing the database schema.

---

## Project structure

```
unipulse/
├── supabase/
│   ├── schema.sql       # tables, triggers, RLS policies, security-definer functions
│   └── seed.sql         # 147 seed universities (UK/CA/AU/US)
├── src/
│   ├── components/      # DotCluster, LiveTicker, Chip, Stat, Logo, modals
│   ├── pages/
│   │   ├── public/       # Home (registration flow), Success, UniversityPage, Privacy
│   │   └── admin/        # Login, Overview, Pipeline, Students, Analytics, Export
│   ├── hooks/            # useAuth, usePoll
│   ├── lib/              # supabase client, csv export, formatting helpers
│   └── types/            # shared TypeScript types matching the DB schema
├── .env.example
└── vercel.json           # SPA rewrite rules
```

## What's deliberately deferred (per the brief's phase-1 scope)

- WhatsApp OTP verification (numbers are collected but not verified in this build)
- Automated WhatsApp/SMS lifecycle nudges at 50/80/100% of threshold
- Payments and tutoring bookings
- Role-based multi-admin permissions (every authenticated Supabase user currently has full admin access)
- CRM integration

The data model (`service_interest`, `communities`, audit logging, per-university `created_by`/`updated_by`) is already in place so none of the above require a schema rebuild — they're additive.

## Troubleshooting

- **Blank page / console error about Supabase env vars**: your `.env` (local) or Vercel environment variables aren't set. Double-check both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **"Row level security" errors when registering**: make sure you ran the *entire* `schema.sql` file — the RLS policies and the `register_student` function are near the bottom.
- **Admin login says invalid credentials**: confirm the user in Supabase Authentication → Users has a green "Confirmed" status, not pending.
- **404 on refreshing an admin or university page after deploying**: this is handled by `vercel.json` — make sure it's present in your repo root when you push to GitHub.
