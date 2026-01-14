# Internship Application Tracker (Next.js + Supabase)

## Live Demo
https://internship-application-tracker-it5xzxkkr.vercel.app

A full-stack web app to track internship applications with authentication, per-user data isolation (RLS), and analytics.

## Features
- Email/password login (Supabase Auth)
- Track applications: company, role, status, applied date
- Optional fields: job URL, location, notes, follow-up date
- Status updates + delete
- Analytics dashboard (by status, applications per week)
- Per-user privacy using Supabase Row Level Security (RLS)

## Tech Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, RLS policies)

## Database Schema (applications)
Key columns:
- `id` (uuid)
- `user_id` (default `auth.uid()`)
- `company`, `role`, `status`, `date_applied`
- `job_url`, `location`, `notes`, `next_followup`

## Running locally
1) Install dependencies
```bash
npm install