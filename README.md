# AI Business Dashboard for SMEs

A production-ready SaaS frontend for SME business intelligence, built with Next.js App Router, TypeScript, Tailwind CSS, and Recharts.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui-style components
- lucide-react
- Recharts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/dashboard`.

## Project Structure

```
app/                    # Routes (dashboard, uploads, insights, etc.)
components/
  layout/               # Sidebar, topbar, dashboard shell
  dashboard/            # Dashboard-specific UI & charts
  ui/                   # Reusable UI primitives
lib/
  mock-data.ts          # Centralized mock data
  utils.ts              # Utilities (cn, formatters)
types/
  index.ts              # Shared TypeScript types
```

## Current Scope

- SaaS layout system (sidebar, topbar, responsive shell)
- Dashboard page with KPI cards and Recharts visualizations
- Placeholder pages for future features
- Mock data only — no backend, auth, or API routes

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
