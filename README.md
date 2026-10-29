# Suwathe CRM

Lead tracking for Suwathe Tech Solutions: businesses to call, conversations, follow-up dates, meetings, deals, payments, renewals and referrals. Works on phone and computer, and can be added to the phone's home screen like an app.

Built with Next.js 16, Tailwind CSS 4 and PostgreSQL (Neon).

## Features

- **Today screen**: overdue and today's follow-ups, meetings this week, renewals due in 30 days, money received and balance to collect, pipeline counts.
- **Leads**: business, contact, phone, type, area, source, referral, interest, quoted and final price, status, next follow-up, meeting time, notes. Search by name, phone or area; filter by status and source. Duplicate phone warning.
- **Lead page**: one-tap call / WhatsApp, quick follow-up buttons (tomorrow, 3 days, 1 week, 1 month, 3 months), status buttons, "What happened?" log with full history.
- **Money**: deal amount, payments (project or renewal), balance.
- **Renewals**: domain, hosting, care plan etc. with due dates; "Renewed" records the payment and moves the date forward one cycle.
- **Referrals**: who referred whom, reward amount and whether it's paid.
- **Staff**: admin adds staff with a temporary password; everyone must set their own password at first sign-in. Staff see leads assigned to them, created by them, or unassigned. Admin sees everything.
- **Security**: passwords hashed with bcrypt, sessions stored in the database (httpOnly cookie), account locks for 15 minutes after 5 wrong passwords, every page and action checks the signed-in user.

## Deploy on Vercel + Neon (one time)

1. **Neon**: create a project (e.g. `suwathe-crm`). On the dashboard, open **Connect**, keep **Connection pooling** on, and copy the connection string.
2. **Vercel**: **Add New → Project → Import** `duraibyes/suwathe-crm`.
3. Before deploying, open **Environment Variables** and add:
   - `DATABASE_URL` = the Neon connection string
4. Press **Deploy**. The build creates all tables and the first admin user automatically.
5. Open the site and sign in with the temporary admin login you were given. You'll be asked to set your own password.

Database changes in future updates are applied automatically on each deploy (`scripts/migrate.mjs`). Never edit an old migration step; add a new one at the end.

## Run locally

```bash
cp .env.example .env.local   # put a DATABASE_URL in it
npm install
npm run db:migrate
npm run dev                  # http://localhost:3000
```

## Where things are

- `scripts/migrate.mjs`: database tables and first admin user
- `lib/constants.ts`: statuses, sources, business types, renewal items (change labels here)
- `app/actions.ts`: everything that saves data (each action checks the signed-in user)
- `app/(app)/`: the screens (Today, Leads, Lead page, Renewals, Staff, Account)
