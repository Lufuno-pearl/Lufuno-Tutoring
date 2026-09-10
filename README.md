# Lufuno Tutoring — setup guide

This is a real web app: Next.js + Supabase (database, auth, and row-level
security so students only ever see their own bookings, and study pack
links only appear once you mark payment confirmed).

## What you'll need (all free to start)
- A GitHub account (to hold the code)
- A Supabase account — https://supabase.com
- A Vercel account — https://vercel.com

## 1. Create the database (Supabase)
1. Go to supabase.com → New project. Pick any name/region, set a database
   password (save it somewhere).
2. Once it's created, go to **SQL Editor → New query**, paste in the
   entire contents of `supabase/schema.sql` from this project, and click
   **Run**. This creates all the tables and security rules in one go.
3. Go to **Project Settings → API**. You'll need two values from here in
   step 3 below: **Project URL** and the **anon public** key.
4. Go to **Authentication → URL Configuration** and, once you have your
   Vercel URL (step 4), add it there as a Redirect URL
   (e.g. `https://your-app.vercel.app/auth/callback`) — for now, add
   `http://localhost:3000/auth/callback` so you can test locally first.
5. Go to **Authentication → Providers → Email** and make sure "Confirm
   email" is switched the way you want (default is fine — it sends a
   magic link automatically).

## 2. Put the code on GitHub
1. Create a new, empty repository on GitHub (no README/license).
2. From this project folder:
   ```
   git init
   git add .
   git commit -m "Initial version"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## 3. Set your environment variables
Copy `.env.local.example` to `.env.local` and fill in the two Supabase
values from step 1.3, plus your local URL:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

To test locally: `npm install` then `npm run dev`, open
http://localhost:3000.

## 4. Deploy (Vercel)
1. vercel.com → Add New Project → import your GitHub repo.
2. In the project's Environment Variables settings, add the same three
   variables as above, but set `NEXT_PUBLIC_SITE_URL` to your real Vercel
   URL (e.g. `https://lufuno-tutoring.vercel.app`) once you know it.
3. Deploy. Then go back to Supabase → Authentication → URL Configuration
   and add `https://your-real-url.vercel.app/auth/callback` as a redirect
   URL too.

## How the tutor account works
There's no separate sign-up for you — just sign in on the same `/login`
page using **pearllufunomoyo@gmail.com**. The database rules
automatically treat that one email as the tutor and give it access to
`/tutor`, where you can mark payments as paid and paste in a Google
Drive link for each study pack once it's confirmed.

## What's deliberately left out of this version
- **Live card/EFT payment processing** — payments are still "student
  clicks I've paid, you confirm manually." Wiring up Yoco or PayFast is
  a good next step once this is live and you want it automated.
- **In-app chat** — cut to keep this version shippable; can be added
  later as a `messages` table the same way bookings work.
