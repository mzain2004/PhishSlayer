<div align="center">

# 🛡️ PHISH-SLAYER

### Next-Gen Threat Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-0D9488?style=for-the-badge)](LICENSE)

**Autonomous Blue Team AI SaaS — Monitor. Analyze. Neutralize.**

_Built and maintained by [@mzain2004](https://github.com/mzain2004) (Muhammad Zain)_

---

</div>

## 🔍 Overview

**Phish-Slayer** is an enterprise-grade cybersecurity command center that provides real-time threat intelligence, automated vulnerability scanning, and AI-powered incident response. Designed for SOC analysts and security teams, it combines a proprietary threat intelligence vault with external scanning engines to deliver instantaneous threat verdicts — all wrapped in a premium, cyber-themed dashboard.

```
┌─────────────────────────────────────────────────────┐
│               PHISH-SLAYER PIPELINE                 │
│                                                     │
│  Target ──▶ Whitelist ──▶ Intel Vault ──▶ VirusTotal│
│              Gate 1         Gate 2         Gate 3   │
│                │               │              │     │
│              SAFE          CRITICAL     GEMINI AI   │
│                               │              │     │
│                          ┌────▼──────────────▼──┐  │
│                          │   🚨 DISCORD ALERT   │  │
│                          │   📄 PDF REPORT      │  │
│                          │   📊 DASHBOARD       │  │
│                          └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ Key Features

### 🔐 Identity & Access Management

- Supabase SSR authentication with email/password + Google/GitHub OAuth
- Middleware-enforced route protection on all dashboard routes
- Row Level Security (RLS) policies — authenticated users only

### 🏴 Proprietary Intel Vault

- Private threat intelligence database with custom indicators (IPs, domains)
- Manual administrative blocking from the incident dashboard
- Instant local lookups before any external API call

### 🤖 Automated Threat Harvester

- URLhaus malware feed auto-sync via Vercel Cron Jobs (every 12h)
- VirusTotal API integration with rate limiting and smart caching
- Google Gemini AI-powered threat analysis and risk scoring

### 🚨 Discord Siren Webhooks

- Real-time red embed alerts on malicious scan detections
- Fires on both dashboard scans and API-initiated scans
- Admin block notifications pushed to your security channel

### 📄 Executive PDF Reporting

- CEO-ready branded PDF reports with scan verdicts and AI summaries
- jsPDF + AutoTable engine with teal/slate branding
- One-click download from the threat analysis dashboard

### 📊 God's Eye Dashboard

- Real-time KPI cards: Total Scans, Malicious %, Active Incidents, Intel Vault size
- Recharts-powered threat category visualization
- Activity feed with verdict badges and trend indicators

### 🔌 Public REST API (v1)

- `GET/POST /api/v1/scan?target=example.com`
- API key authentication via `x-api-key` header
- Full 3-gate pipeline with JSON response

### 📥 Incident Management

- Full CRUD incident lifecycle with resolve/delete/block actions
- Excel export (`.xlsx`) of incident reports
- Severity badges, risk score bars, and assignee tracking

---

## 🛠️ Tech Stack

| Layer           | Technology                             |
| --------------- | -------------------------------------- |
| **Framework**   | Next.js 15.5.12 (App Router)           |
| **Language**    | TypeScript                             |
| **Auth & DB**   | Supabase (PostgreSQL + SSR Auth + RLS) |
| **Styling**     | Tailwind CSS v3.4 + shadcn/ui          |
| **AI Engine**   | Google Gemini 2.5 Flash                |
| **CTI Scanner** | VirusTotal API                         |
| **Alerts**      | Discord Webhooks                       |
| **Payments**    | Stripe SDK v14                         |
| **PDF**         | jsPDF + jsPDF-AutoTable                |
| **Charts**      | Recharts                               |
| **Excel**       | SheetJS (xlsx)                         |
| **Deployment**  | Vercel (with Cron Jobs)                |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project
- A [VirusTotal](https://virustotal.com) API key
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/mzain2004/phish-slayer.git
cd phish-slayer

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file in the root directory with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Scanning & AI
VIRUS_TOTAL_API_KEY=your_virustotal_key
GEMINI_API_KEY=your_gemini_key

# Alerts
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Public API
PHISH_SLAYER_API_KEY=your_api_key

# Intel Harvester CRON
URLHAUS_AUTH_KEY=your_urlhaus_key
CRON_SECRET=your_cron_secret

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# EDR Agent
AGENT_SECRET=your_agent_secret
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
phish-slayer/
├── app/
│   ├── auth/               # Login, signup, OAuth callback
│   ├── api/
│   │   ├── v1/scan/        # Public REST API
│   │   ├── intel/sync/     # URLhaus CRON harvester
│   │   └── agent/          # EDR Agent APIs (WS, Commands, Download)
│   └── dashboard/
│       ├── page.tsx         # God's Eye Command Center
│       ├── incidents/       # Incident management + Excel export
│       ├── scans/           # Scan launcher & history
│       ├── threats/         # Threat deep-dive + PDF export
│       ├── intel/           # Intel Vault + API docs
│       └── agents/          # EDR Agent Fleet Management
├── lib/
│   ├── ai/analyzer.ts       # Gemini AI threat analysis
│   ├── scanners/             # VirusTotal integration
│   ├── supabase/             # Auth, actions, middleware
│   └── agent/                # Endpoint monitoring agent code
├── public/                 # Agent installer scripts
├── server.js               # Custom Next.js server with WebSocket support
├── middleware.ts             # Route protection guard
└── vercel.json               # CRON job configuration
```

---

## 🔒 Security

- **Zero Trust Auth:** All dashboard routes protected by Supabase SSR middleware
- **RLS Enforced:** Database operations restricted to authenticated users only
- **API Key Auth:** Public API secured with `x-api-key` header validation
- **CRON Security:** Intel harvester secured with bearer token verification
- **Input Validation:** Zod schemas on all server action payloads
- **No Secrets in Git:** Comprehensive `.gitignore` covering all environment files

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## PM2 Deployment Update

After the EDR server extension, the Azure VM PM2 config MUST be updated manually to prevent crashes:

```bash
pm2 stop phish-slayer
pm2 delete phish-slayer
pm2 start server.js --name phish-slayer --node-args="--max-old-space-size=512"
pm2 save
```

---

<div align="center">

**Built with 🛡️ by [mzain2004](https://github.com/mzain2004) (Muhammad Zain)**

_Protecting the internet, one scan at a time._

</div>