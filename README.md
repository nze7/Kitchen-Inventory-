# Kitchen Inventory Management System

A role-based kitchen inventory app built with Next.js, Supabase, and Vercel. Management can set up locations, items, and PAR levels. Staff can log inventory with date and initials. Reports help identify over/under-ordered items.

## Features

- **Management Dashboard**: Create locations, manage items, set PAR levels, view users
- **Staff Inventory Logging**: Record item quantities with automatic date/time and staff initials
- **Inventory History**: View and filter past inventory logs
- **Reporting & Analytics**: Identify under-ordered and over-ordered items with actionable metrics
- **Role-Based Access Control**: Separate workflows for management and staff using Supabase RLS
- **CSV Export**: Export reports for operational review

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Hosting**: Vercel
- **Validation**: Zod
- **Utilities**: date-fns

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 3. Run Database Migrations
In Supabase dashboard SQL Editor, run: `supabase/migrations/001_initial_schema.sql`

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Setup Instructions

See README.md (full documentation) for complete setup, deployment, and troubleshooting guides.
