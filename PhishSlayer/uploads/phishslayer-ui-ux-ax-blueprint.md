# PhishSlayer — UI/UX/AX Architecture Blueprint
**Output for:** Claude Design | **Version:** 1.0 | **Date:** 2026-05-06
**Stack:** Next.js 15 · Electric Indigo + Amethyst · Inter + Söhne · Dark-mode first

---

## Executive Summary

PhishSlayer is a dense, data-heavy security operations dashboard for MSSP analysts. The design language is **industrial precision** — not a consumer app, not an enterprise gray box. Every pixel serves a function. Analysts work in dark rooms on wide monitors, often under stress, reading dozens of alerts at a time. The interface must:

- Surface the most critical information without requiring interaction
- Make AI agent confidence and reasoning legible, not magical
- Never block an analyst from acting — even the consequence gate is a decision surface, not a wall
- Earn trust by being predictably structured — same layout, same patterns, every time

**Design Tone:** Dark-mode-first. Dense but not cluttered. Military precision meets fintech dashboard. Think Vercel's clarity × Datadog's density × no enterprise gray.

**Critical Design Principle:** Every screen has exactly ONE primary action. The eye should land on it within 200ms.

---

## Design System Tokens

### Color Palette

```
/* PRIMARY BRAND */
--indigo-50:  #EEF2FF
--indigo-100: #E0E7FF
--indigo-200: #C7D2FE
--indigo-400: #818CF8
--indigo-500: #6366F1   /* Electric Indigo — primary CTA */
--indigo-600: #4F46E5   /* Primary pressed state */
--indigo-700: #4338CA   /* Active nav */
--indigo-900: #312E81   /* Deep accent */

--amethyst-400: #C084FC
--amethyst-500: #A855F7   /* Amethyst — secondary accent */
--amethyst-600: #9333EA
--amethyst-700: #7C3AED

/* SEMANTIC SEVERITY */
--severity-critical: #EF4444   /* red-500 */
--severity-high:     #F97316   /* orange-500 */
--severity-medium:   #EAB308   /* yellow-500 */
--severity-low:      #6B7280   /* gray-500 */

/* SEMANTIC STATUS */
--status-closed:       #22C55E  /* green-500 */
--status-triaging:     #EAB308  /* amber — pulse animation */
--status-escalated:    #F97316  /* orange */
--status-responded:    #6366F1  /* indigo */
--status-fp:           #6B7280  /* gray, muted */
--status-pending:      #4B5563  /* gray-600 */

/* BLAST RADIUS */
--blast-user:   #22C55E   /* green — contained */
--blast-device: #EAB308   /* amber — moderate */
--blast-org:    #F97316   /* orange — serious */
--blast-tenant: #EF4444   /* red — critical */

/* CONFIDENCE */
--conf-high:    #22C55E   /* >= 0.85 */
--conf-medium:  #EAB308   /* 0.60 - 0.85 */
--conf-low:     #EF4444   /* < 0.60 */

/* BACKGROUNDS */
--bg-base:      #0A0A0F   /* Page background — near black */
--bg-surface:   #111118   /* Cards, panels */
--bg-elevated:  #1A1A24   /* Dropdowns, tooltips */
--bg-border:    #2A2A3A   /* Dividers */
--bg-hover:     #1E1E2E   /* Row hover */

/* TEXT */
--text-primary:   #F1F5F9   /* Main content */
--text-secondary: #94A3B8   /* Labels, subtitles */
--text-tertiary:  #475569   /* Hints, timestamps */
--text-disabled:  #334155
```

### Typography

```
/* DISPLAY — Söhne (loaded via @font-face or Fontshare) */
--font-display: 'Söhne', 'SF Pro Display', system-ui

/* BODY + UI — Inter */
--font-body: 'Inter', system-ui

/* MONO — for IPs, hashes, code */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace

/* SCALE */
--text-xs:   11px / 1.4  (timestamps, badges)
--text-sm:   13px / 1.5  (table cells, subtitles)
--text-base: 15px / 1.6  (body copy)
--text-lg:   18px / 1.4  (section headers)
--text-xl:   22px / 1.3  (page titles)
--text-2xl:  28px / 1.2  (dashboard hero numbers)
--text-3xl:  36px / 1.1  (big metric displays)
```

### Spacing Grid
```
4px base unit — all spacing is multiples of 4
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

### Border Radius
```
--radius-sm:  4px   (badges, chips)
--radius-md:  8px   (cards, buttons, inputs)
--radius-lg:  12px  (panels, modals)
--radius-xl:  16px  (large containers)
--radius-full: 9999px (pill badges)
```

### Elevation / Shadows (subtle, no glow)
```
--shadow-sm:  0 1px 2px rgba(0,0,0,0.4)
--shadow-md:  0 4px 12px rgba(0,0,0,0.5)
--shadow-lg:  0 8px 24px rgba(0,0,0,0.6)
```

---

## Global Layout Architecture

### Shell Layout (all authenticated screens)
```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR (48px fixed)                                        │
│  [Logo] [OrgPicker] ────────────── [Tier Badge] [User]     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  SIDENAV │  MAIN CONTENT AREA                               │
│  (220px) │  (flex-1, scrollable)                            │
│          │                                                   │
│  fixed   │                                                   │
│  left    │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### Topbar Spec
- Height: 48px
- Background: `--bg-surface` with 1px bottom border `--bg-border`
- Left: PhishSlayer wordmark (Söhne, 15px, `--indigo-400`) + version chip
- Center: OrgPicker dropdown (shows current org name, chevron, switches orgs)
- Right: TierBadge chip (FREE/SOC PRO/CMD CENTER) + NotificationBell + UserAvatar

### Sidenav Spec
- Width: 220px (collapsed: 56px icon-only)
- Background: `--bg-surface`
- Right border: 1px `--bg-border`
- Nav sections:
  ```
  ── OPERATIONS
     Alerts         /alerts        [shield icon]  + LiveCount badge
     Hunting        /hunting       [crosshair]    + ActiveHunts badge
  ── INTELLIGENCE
     IOCs           /intelligence/ioc  [fingerprint]
     Reports        /intelligence/reports  [file-text]
  ── PLATFORM
     Agents         /agents        [cpu icon]
     Evolution      /evolution     [dna icon]    + PendingProposals dot
     Metrics        /metrics       [chart-bar]
  ── SETTINGS
     Settings       /settings      [settings]
  ```
- Active state: `--indigo-500` left border (3px) + `--indigo-900` bg + `--indigo-400` text
- Hover state: `--bg-elevated` bg
- LiveCount badge: red pill, pulses if > 0 CRITICAL alerts
- Collapse toggle: chevron at bottom of sidenav

---

## Screen Specifications

---

### SCREEN 1: Onboarding Wizard

**Route:** `/onboarding`
**Blocks access** to main shell until Wazuh connected.
**Layout:** Centered card, no sidenav, minimal topbar (logo only).

```
┌─────────────────────────────────────────┐
│  [Step 1 ●] [Step 2 ○] [Step 3 ○]      │  ← StepIndicator
│                                         │
│  CONNECT WAZUH                          │  ← Söhne, 22px
│  Paste your webhook URL below           │  ← text-secondary
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ https://phishslayer.tech/api/   │    │  ← ReadOnlyCopyField
│  │ webhooks/wazuh?token=xxx        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Send Test Alert]                      │  ← primary button
│                                         │
│  ○ Waiting for ping...                  │  ← StatusIndicator
│                                         │
│  [Continue →]  (disabled until ping)    │
└─────────────────────────────────────────┘
```

**Step States:**
- `IDLE`: Copy field shown, button enabled, status = "Waiting for ping..."
- `WAITING`: Button shows spinner, status = "Waiting... (28s)"
- `SUCCESS`: Status = green checkmark + "Connected!" + Continue button enabled
- `TIMEOUT`: Status = red "No ping received in 30s. Check ossec.conf webhook config."
- `ERROR`: Red inline error with Wazuh config code snippet

**Step 2 (Graph — optional):**
```
┌─────────────────────────────────────────┐
│  CONNECT MICROSOFT 365  (optional)      │
│  Enables identity anomaly detection     │
│                                         │
│  [Connect Microsoft 365]  ← OAuth CTA   │
│  Opens Azure consent popup              │
│                                         │
│  ─── OR ───                             │
│                                         │
│  [Skip for now →]                       │
└─────────────────────────────────────────┘
```

**Step 3 (Confirm):**
- Summary card: Wazuh ✓ (green) | Graph ✓ or Skip (gray)
- Tier display
- [Go to Dashboard] → primary indigo button, full width

**AX Notes:**
- Focus moves to first interactive element on step mount
- Step indicator uses `aria-current="step"`
- Timeout countdown announced via `aria-live="polite"`
- Skip button explicitly labeled "Skip Microsoft Graph connection for now"

---

### SCREEN 2: Alert Queue (Main View)

**Route:** `/alerts`
**Primary action:** Click a row → opens detail panel.

```
┌─ PAGE HEADER ────────────────────────────────────────────────┐
│  Alerts                           [+ Manual Alert]           │
│  47 open · 12 AI resolved · 3 pending review                 │
└──────────────────────────────────────────────────────────────┘

┌─ FILTER BAR ─────────────────────────────────────────────────┐
│  [All Severity ▾] [All Status ▾] [Attack Type ▾] [Last 24h ▾]│
│                                           [Search IPs/assets] │
└──────────────────────────────────────────────────────────────┘

┌─ ALERT TABLE ────────────────────────────────────────────────┐
│ SEV  │ ATTACK TYPE    │ SOURCE IP      │ STATUS   │ CONF │ AGE│
├──────┼────────────────┼────────────────┼──────────┼──────┼────┤
│ CRIT │ Credential     │ 185.220.101.xx │ ⚡TRIAGING│  —   │ 2m │
│      │ stuffing       │               │ [pulse]  │      │    │
├──────┼────────────────┼────────────────┼──────────┼──────┼────┤
│ HIGH │ Impossible     │ 45.33.32.156   │ ESCALATED│ 0.71 │ 8m │
│      │ travel         │               │          │      │    │
├──────┼────────────────┼────────────────┼──────────┼──────┼────┤
│ MED  │ Brute force    │ 192.168.1.45  │ RESPONDED│ 0.88 │ 15m│
└──────┴────────────────┴────────────────┴──────────┴──────┴────┘

▸ AI Resolved (12)     ← collapsed group, click to expand
```

**Row Component Spec:**

Each row is a `<tr>` with:
- `data-severity` = critical|high|medium|low
- `data-status` = pending|triaging|escalated|responded|closed|fp
- Left accent bar: 3px colored strip (severity color) on row left edge
- Hover: bg changes to `--bg-hover`, subtle right arrow appears
- Active/selected: `--indigo-900` bg with `--indigo-500` left border 3px

**SeverityBadge:**
```
CRITICAL: bg #EF4444/15, text #FCA5A5, border #EF4444/30, filled pill
HIGH:     bg #F97316/15, text #FDBA74, border #F97316/30, filled pill
MEDIUM:   bg #EAB308/15, text #FDE047, border #EAB308/30, outlined pill
LOW:      bg transparent, text --text-tertiary, border --bg-border, outlined
```

**StatusBadge:**
```
TRIAGING:  amber pill + pulsing dot animation (CSS keyframes, 1.5s)
ESCALATED: orange pill, static
RESPONDED: indigo pill, static
CLOSED:    gray muted text (no pill), reduced opacity
FALSE_POS: strikethrough text, gray
PENDING:   dark gray pill
```

**ConfidenceBar:**
```
Container: 64px wide, 6px tall, bg --bg-border, radius-full
Fill: width = confidence * 100%, color:
  >= 0.85: --status-closed (green)
  >= 0.60: --severity-medium (amber)
  < 0.60:  --severity-critical (red)
Transition: width 300ms ease
Show "—" if agent not yet run
```

**Keyboard Navigation:**
- `↑↓` arrows: move row focus
- `Enter`: open detail panel
- `Escape`: close detail panel
- `f`: mark focused alert as false positive (with confirm dialog)
- `?`: show keyboard shortcut cheatsheet overlay

**Real-time Row Update Animation:**
```
1. Row receives update via Supabase Realtime
2. Row background flashes to --indigo-900 (150ms)
3. Transitions back to normal (300ms ease)
4. Status badge and confidence bar animate to new values
```

**AI Resolved Collapsed Group:**
```
Row with: [▸] icon + "AI Resolved (12)" + light gray text
          "Expand to see auto-closed alerts"
Expanded: shows all closed rows with reduced opacity (0.6)
          Full trace still accessible
```

**AX Notes:**
- Table uses `role="grid"` with `aria-rowcount`
- Status badges include `aria-label` (not just visual color)
- TRIAGING pulse animation: `prefers-reduced-motion` disables it
- Live region (`aria-live="polite"`) announces new alerts: "New CRITICAL alert: Credential stuffing from 185.220.101.xx"
- Row count in header updates via `aria-atomic`

---

### SCREEN 3: Alert Detail Panel

**Trigger:** Click any alert row
**Type:** Slide-in panel from RIGHT (not new page)
**Width:** 480px (desktop), full width mobile
**Overlay:** Semi-transparent backdrop `rgba(0,0,0,0.5)` on left

```
┌─ PANEL HEADER ─────────────────────────────────────────┐
│  [← Back]              ALERT #3f92...  [⧉ Full page]  │
│  ────────────────────────────────────────────────────  │
│  Credential stuffing         CRITICAL           8 min  │
│  185.220.101.xx → user@company.com              ESCALATED│
└────────────────────────────────────────────────────────┘

┌─ TIMELINE ─────────────────────────────────────────────┐
│  ● Ingested         12:34:01   ←──── 2m ────→          │
│  ● L1 Started       12:34:03                           │
│  ● L1 Complete      12:34:06   confidence: 0.71        │
│  ● L2 Escalated     12:34:06                           │
│  ● L2 Running       12:34:08   [spinner if active]     │
└────────────────────────────────────────────────────────┘

┌─ L1 TRACE ─ [expand/collapse] ─────────────────────────┐
│  ▸ Tool: vt_check_ip                        340ms  ✓   │
│    Input: 185.220.101.xx                               │
│    Result: threat_score: 94, positives: 47/72          │
│                                                        │
│  ▸ Tool: abuseipdb_check                   210ms  ✓   │
│    Input: 185.220.101.xx                               │
│    Result: abuse_confidence: 89%                       │
│                                                        │
│  ▸ RAG Query                               180ms  ✓   │
│    "credential stuffing Tor exit node"                 │
│    Match: "APT-41 TTP report p.12" (0.87 sim)          │
│                                                        │
│  Confidence: ████████░░  0.71                          │
│  Decision: ESCALATE → L2                               │
│  [Raw JSON]                                            │
└────────────────────────────────────────────────────────┘

┌─ L2 TRACE ─ [active — streaming] ──────────────────────┐
│  ▸ Tool: graph_get_signin_logs              [running]  │
│    Fetching sign-in history for user@co.com...         │
│  [streaming cursor]                                    │
└────────────────────────────────────────────────────────┘
```

**TraceItem Component:**
```
Container: 12px padding, border-left 2px --bg-border
Header row: [▸/▾ toggle] [tool name, mono 13px] [duration badge] [status icon]
  duration badge: bg --bg-elevated, text --text-secondary, 11px
  status: ✓ green, ✗ red, ⟳ spinning amber
Expanded body: 
  "Input:" row: mono 12px, --text-tertiary label + --text-secondary value
  "Result:" row: same
  Long values truncated at 120 chars with "... show more" link
```

**Streaming State:**
- New trace items appear with a 150ms fade-in
- Blinking cursor `▌` after last streaming line
- Token counter in corner: "1,240 tokens used"
- "Analysis complete" banner when agent finishes

**ConsequencePanel (when L2 queued for human):**
```
┌─ ACTION REQUIRED ─────────────────────────────────────────┐
│  ⚠ L2 requires your approval before executing             │
│                                                           │
│  Proposed action:  Revoke all sessions for user@co.com    │
│                                                           │
│  BLAST RADIUS                                             │
│  [○user] [○device] [○org] [○tenant]                       │
│   ████   (filled = affected)                              │
│   USER ONLY — contained impact                            │
│                                                           │
│  FALSE POSITIVE PROBABILITY                               │
│  [████████░░░░░░░░░░░░] 38%                               │
│                                                           │
│  SIDE EFFECTS                                             │
│  • User will be logged out of all Microsoft 365 apps      │
│  • Requires re-authentication                             │
│                                                           │
│  ROLLBACK                                                 │
│  ▸ Show rollback steps (3 steps)                          │
│                                                           │
│  ┌─────────────────┐  ┌──────────────────────┐           │
│  │  ✓ Approve      │  │  ✗ Reject            │           │
│  └─────────────────┘  └──────────────────────┘           │
│                                                           │
│  Recovery time estimate: ~5 minutes                       │
└───────────────────────────────────────────────────────────┘
```

**BlastRadiusDiagram:**
```
4 concentric circles, left-aligned:
  Outermost: TENANT (red, --blast-tenant)
  Next:      ORG    (orange, --blast-org)
  Next:      DEVICE (amber, --blast-device)
  Innermost: USER   (green, --blast-user)

Affected rings: full opacity + label badge
Non-affected rings: 15% opacity, no label
Transition: opacity 400ms on load

Size: 120px × 120px SVG
```

**FalsePositiveBar:**
```
Container: full width, 8px tall, bg --bg-border
Fill: width = fpProbability * 100%
Color stops:
  0-20%:  green
  20-50%: amber (transition)
  50%+:   red (with warning icon)
Percentage label: right-aligned, 13px, color matches fill
```

**Two-Person Approval State:**
```
When blast_radius in [org, tenant]:
  Approve button: disabled, shows lock icon
  Message: "This action affects the entire org.
            A second analyst must also approve."
  Status chip: "Awaiting 2nd approval · 0/2 approved"
  
After first approval:
  Status chip: "1/2 approvals · Waiting for colleague"
  Realtime: second analyst sees "URGENT: Approval needed" badge
```

**AX Notes:**
- Panel traps focus using `focus-trap` library
- `role="dialog"` with `aria-labelledby` pointing to alert title
- Escape key closes panel, focus returns to the row that opened it
- ConsequencePanel consequence items use `role="list"` with descriptive `aria-label`
- Approve/Reject buttons: explicit `aria-label="Approve action: Revoke sessions for user@company.com"`
- Disabled approve button: `aria-disabled="true"` + tooltip explaining requirement

---

### SCREEN 4: L3 Hunt View

**Route:** `/hunting/[huntId]`
**Also accessible** as expandable section inside Alert Detail Panel

```
┌─ HUNT HEADER ─────────────────────────────────────────────┐
│  Deep Hunt #8a3f...            Dispatched 2 min ago       │
│  "Investigate APT campaign — 185.220.101.xx"              │
│                                                           │
│  [Reader ✓] ──→ [Hunter ⟳] ──→ [Reviewer ○]              │
│   Complete       Running         Pending                  │
└───────────────────────────────────────────────────────────┘

┌─ LIVE LOG ────────────────────────────────────────────────┐
│  12:34:08  Reader  Analyzing alert context...             │
│  12:34:09  Reader  Loading 3 similar past incidents...    │
│  12:34:11  Reader  Context ready. 4 IOCs identified.      │
│  12:34:12  Hunter  Checking 185.220.101.xx on VT...       │
│  12:34:14  Hunter  Crawling domain associated-domain.cc   │
│  12:34:16  Hunter  Found 2 related campaigns in RAG...    │
│  12:34:18  Hunter  Expanding IOC graph... ▌               │  ← cursor
└───────────────────────────────────────────────────────────┘

[ Hunt Report renders below when Reviewer completes ]
```

**PhaseIndicator:**
```
3 pills connected by lines:
  Complete:  filled circle, green bg, checkmark icon
  Running:   filled circle, amber bg, spinning ring animation
  Pending:   outline circle, --bg-border, gray text

Line between pills:
  Complete→Complete: solid green
  Complete→Running:  half green / half gray (animated fill)
  Anything else:     dashed gray
```

**LiveLog:**
```
Container: bg --bg-surface, border --bg-border, monospace 13px
Max height: 280px, overflow-y: auto, auto-scrolls to bottom
New line: fade-in 150ms
Columns:
  Timestamp: --text-tertiary, 11px, mono (right-aligned, 60px wide)
  Agent:     color-coded chip (Reader=teal, Hunter=coral, Reviewer=amber)
  Message:   --text-primary, 13px

Domain/IP values: --indigo-400, underline on hover
```

**Hunt Report (rendered after completion):**
```
┌─ EXECUTIVE SUMMARY ─────────────────────── [expanded] ────┐
│  APT-41 affiliated campaign targeting credential           │
│  harvesting via Tor exit nodes. High confidence (0.89).    │
│  Recommend: immediate session revocation + password reset. │
└───────────────────────────────────────────────────────────┘

┌─ IOC TABLE ─────────────────────────────── [collapsed ▸] ─┐
│  IP: 185.220.101.xx · Domain: evil.cc · Hash: 3f92...     │
└───────────────────────────────────────────────────────────┘

┌─ MITRE ATT&CK ──────────────────────────── [collapsed ▸] ─┐
│  T1110 Brute Force · T1078 Valid Accounts · T1133 VPN     │
└───────────────────────────────────────────────────────────┘

┌─ RECOMMENDATIONS ───────────────────────── [collapsed ▸] ─┐
│  1. Revoke all sessions for affected users                 │
│  2. Enable conditional access for Tor exit nodes           │
│  3. Review VPN access logs for past 72h                    │
└───────────────────────────────────────────────────────────┘

  [📥 Export PDF]   [📚 Index to Threat Intel]
```

**IOC Table Spec:**
```
Columns: Type | Value (mono) | Threat Score | First Seen | Related Alerts
Sortable by: Threat Score (default DESC), First Seen
Value column: monospace font, copy-on-click
Threat Score: colored number + mini bar (same as ConfidenceBar)
```

**MITRE ATT&CK Badge Grid:**
```
Each technique: pill badge
  bg: --bg-elevated
  border: --bg-border
  text: ID (bold, indigo) + Name (gray)
  hover: show full technique description tooltip
  on click: opens MITRE ATT&CK URL
Max visible: 6 badges, "+N more" pill if > 6
```

---

### SCREEN 5: SOC Metrics Dashboard

**Route:** `/metrics`
**Primary audience:** SOC managers, morning standup reviews

```
┌─ HEADER ─────────────────────────────────────────────────────┐
│  Metrics                              [7d ●] [30d] [90d]     │
└──────────────────────────────────────────────────────────────┘

┌─ STAT CARDS ROW ─────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  MTTR    │  │ Alerts   │  │ Auto     │  │    FP    │    │
│  │ 4.2 min  │  │  Today   │  │ Close    │  │  Rate    │    │
│  │          │  │   247    │  │   82%    │  │   3.1%   │    │
│  │ ▼ 12%    │  │ ▲ 18%    │  │ ▲ 4%    │  │ ▼ 0.8%   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────────────────────────────────────────────┘

┌─ CHARTS ROW ─────────────────────────────────────────────────┐
│                                                               │
│  MTTR Trend (line chart)      Alert Volume (bar chart)       │
│  ─────────────────────        ──────────────────────         │
│  Target SLA line at 15min     Stacked by severity            │
│  7-day rolling average        Color: CRIT/HIGH/MED/LOW       │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌─ AGENT PERFORMANCE TABLE ────────────────────────────────────┐
│  Agent  │ Avg Latency │ Tokens/Alert │ Success Rate │ Active  │
│  L1     │ 3.2s        │ 1,240        │ 98.2%        │ ✓       │
│  L2     │ 11.4s       │ 3,890        │ 94.7%        │ ✓       │
│  L3     │ 67s         │ 8,240        │ 91.2%        │ ✓       │
└──────────────────────────────────────────────────────────────┘
```

**StatCard Spec:**
```
Size: flex-1, min-width 160px, padding 20px
bg: --bg-surface, border 1px --bg-border
Value: Söhne 32px, --text-primary
Label: Inter 12px uppercase tracking-wide, --text-tertiary
Delta: 13px, green if improving, red if worsening
  ▲ for increase (green if MTTR, FP Rate going down is green)
  ▼ for decrease
  Direction semantics defined per metric (lower MTTR = good)
```

**Charts (Recharts):**
```
Background: transparent
Grid lines: --bg-border, 0.5px
Axis text: --text-tertiary, 12px
Line color: --indigo-500
Area fill: --indigo-500 at 10% opacity
Tooltip: --bg-elevated bg, 1px --bg-border border, no shadow
SLA target line: dashed --severity-medium, labeled inline
```

---

### SCREEN 6: Evolution Dashboard

**Route:** `/evolution`

```
┌─ HEADER ─────────────────────────────────────────────────────┐
│  Evolution                                                    │
│  3 proposals awaiting review                                  │
└──────────────────────────────────────────────────────────────┘

┌─ TABS ───────────────────────────────────────────────────────┐
│  [Timeline ●]  [Capabilities]  [HALO Optimizer]             │
└──────────────────────────────────────────────────────────────┘

── TIMELINE TAB ───────────────────────────────────────────────

┌─ EVENT ITEM (PROPOSED) ──────────────────────────────────────┐
│  ◉ [OPENSPACE] [L1] [PROPOSED]                    2h ago    │
│                                                             │
│  Action space rebalanced                                    │
│  vt_check_ip promoted to rank #1 for credential_stuffing    │
│  Expected improvement: +6.2% accuracy                      │
│                                                             │
│  BEFORE                          AFTER                      │
│  1. abuseipdb_check              1. vt_check_ip             │
│  2. vt_check_ip                  2. abuseipdb_check         │
│  3. urlscan_submit               3. urlscan_submit          │
│                                                             │
│  [✓ Approve]      [✗ Reject]                                │
└─────────────────────────────────────────────────────────────┘

┌─ EVENT ITEM (APPLIED) ───────────────────────────────────────┐
│  ◉ [HALO] [L2] [APPLIED]                          Yesterday │
│  Confidence threshold: 0.85 → 0.87                          │
│  Applied by: John (SOC Manager)  at 14:32                   │
│  Result: FP rate dropped 1.2% in 24h                        │
└─────────────────────────────────────────────────────────────┘
```

**EventChip Colors:**
```
OPENSPACE: --amethyst-500 bg at 15%, --amethyst-400 text
HALO:      --severity-medium bg at 15%, amber text
EVOMAP:    teal bg at 15%, teal text
PROPOSED:  --severity-high bg at 15%, orange text + pulsing border
APPLIED:   --status-closed bg at 15%, green text
REJECTED:  --bg-elevated bg, --text-tertiary text, strikethrough
```

**Before/After Diff:**
```
Side-by-side two-column layout
Changed items: highlighted with --indigo-900 bg
Arrows: → between columns showing direction of change
```

**── HALO TAB ──**
```
┌─ CONFIDENCE THRESHOLD CHART ─────────────────────────────────┐
│  threshold ──── (line, indigo)                               │
│  FP rate - - -  (dashed, red)                                │
│                                                              │
│  Current: 0.87 threshold · 3.1% FP rate                     │
└──────────────────────────────────────────────────────────────┘

┌─ PENDING SUGGESTION ─────────────────────────────────────────┐
│  HALO suggests: 0.87 → 0.89                                  │
│  Basis: 50-incident analysis · Expected FP reduction: -0.8%  │
│  [Apply Suggestion]  [Dismiss]                               │
└──────────────────────────────────────────────────────────────┘
```

---

### SCREEN 7: Settings — Integrations

**Route:** `/settings/integrations`

```
┌─ WAZUH CONNECTION ───────────────────────────────────────────┐
│  ✓ Connected          Last ping: 2 min ago                   │
│  Webhook URL: https://...wazuh?token=xxx  [Copy] [Regenerate]│
│  Alerts received today: 247                                  │
└──────────────────────────────────────────────────────────────┘

┌─ MICROSOFT GRAPH ────────────────────────────────────────────┐
│  ✓ Connected                                                 │
│  Tenant: contoso.onmicrosoft.com                             │
│  Permissions: User.Read, AuditLog.Read, Directory.Read       │
│  [Disconnect]  [Re-authorize]                                │
└──────────────────────────────────────────────────────────────┘

┌─ POLAR BILLING ──────────────────────────────────────────────┐
│  Plan: SOC Pro · $299/mo · Renews June 6                     │
│  Usage: 312/500 alerts today (62%)                           │
│  [Upgrade to Command Center]  [Manage Billing]               │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Library

### Shared Components Catalog

| Component | Props | States | Used On |
|---|---|---|---|
| `SeverityBadge` | severity | — | AlertTable, AlertDetail |
| `StatusBadge` | status | triaging=pulse | AlertTable |
| `ConfidenceBar` | score, width | loading | AlertDetail, Trace |
| `BlastRadiusDiagram` | radius | — | ConsequencePanel |
| `FalsePositiveBar` | probability | high=warning | ConsequencePanel |
| `AgentTraceLitem` | tool, input, result, duration, status | expanded, streaming | AlertDetail |
| `PhaseIndicator` | phases[{name, status}] | — | HuntView |
| `LiveLog` | lines[], streaming | active | HuntView |
| `StatCard` | label, value, delta, semantic | — | MetricsDashboard |
| `EvolutionChip` | type, status | proposed=pulse | EvolutionTimeline |
| `BeforeAfterDiff` | before[], after[] | — | EvolutionDetail |
| `MITREBadge` | techniqueId, name | — | HuntReport |
| `IOCTable` | iocs[] | loading | HuntReport, Intelligence |
| `TierBadge` | tier | — | Topbar |
| `TwoPersonApproval` | approvals[], required | waiting | ConsequencePanel |

---

## State Management Architecture

### Global State (Zustand stores)

```
alertStore
  activeAlerts: Alert[]
  selectedAlertId: string | null
  filters: AlertFilters
  realtimeSubscription: RealtimeChannel
  actions: { selectAlert, updateAlert, applyFilters }

agentStore
  runningAgents: { [alertId]: AgentLevel }
  traceStreams: { [alertId]: TraceItem[] }
  actions: { startStream, appendTrace, completeStream }

orgStore
  currentOrg: Org
  tier: Tier
  halorThreshold: number
  actions: { switchOrg }

evolutionStore
  proposals: Proposal[]
  pendingCount: number
  actions: { approve, reject, dismiss }
```

### Server State (TanStack Query)
- Alert list: `useAlerts(orgId, filters)` — 30s stale time
- Alert detail: `useAlert(alertId)` — refetch on focus
- Metrics: `useMetrics(orgId, period)` — 60s stale time
- Hunt report: `useHunt(huntId)` — stale:Infinity once complete
- Intelligence: `useIntelligence(orgId, query)` — 5min stale time

---

## Animation & Motion Spec

```
/* PAGE TRANSITIONS */
Route change: fade + slight upward translate (200ms, ease-out)

/* PANEL SLIDE-IN (Alert Detail) */
Enter: translateX(100%) → translateX(0), 250ms cubic-bezier(0.16, 1, 0.3, 1)
Exit:  translateX(0) → translateX(100%), 200ms ease-in

/* ROW HIGHLIGHT (Realtime update) */
0ms:   background flash to --indigo-900
150ms: transition to --bg-hover
400ms: transition to transparent (settled)

/* TRIAGING PULSE */
@keyframes pulse-ring {
  0%  { box-shadow: 0 0 0 0px rgba(234, 179, 8, 0.4) }
  70% { box-shadow: 0 0 0 6px rgba(234, 179, 8, 0) }
  100%{ box-shadow: 0 0 0 0px rgba(234, 179, 8, 0) }
}
period: 1.5s, infinite
stops when status changes away from TRIAGING

/* CONFIDENCE BAR FILL */
width transition: 600ms cubic-bezier(0.34, 1.56, 0.64, 1) (slight spring)

/* TRACE ITEM APPEAR (streaming) */
opacity: 0 → 1, translateY(4px) → 0, 150ms ease-out

/* EVOLUTION PROPOSAL PULSE */
border-color cycles: --bg-border → --severity-high/50 → --bg-border
period: 2s, only on PROPOSED items

/* AGENT PHASE TRANSITION */
Phase line fill: width 0 → 100%, 800ms ease, triggered on phase complete

/* LOADING SKELETON */
shimmer: linear-gradient sweep left to right, 1.5s infinite
color: --bg-elevated → --bg-border → --bg-elevated
```

**Reduced Motion:**
- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- Fallback: instant state changes, no transforms
- Exception: spinner (kept for functional indication of running state)

---

## Accessibility Matrix

| Screen | WCAG Criteria | Implementation |
|---|---|---|
| Alert Queue | 1.4.1 Use of Color | Status badges use text + color |
| Alert Queue | 2.1.1 Keyboard | Full keyboard navigation + shortcuts |
| Alert Queue | 4.1.3 Status Messages | aria-live for new alert announcements |
| Alert Detail | 1.4.3 Contrast | All text passes AA on dark bg |
| ConsequencePanel | 3.3.2 Labels/Instructions | Every field has descriptive label |
| ConsequencePanel | 2.1.2 No Keyboard Trap | Focus trap with documented exit |
| ConsequencePanel | 3.2.2 On Input | Approve/Reject require deliberate click |
| Hunt View | 2.2.2 Pause/Stop | Streaming log has pause button |
| All | 1.1.1 Non-text Content | All icons have aria-label or aria-hidden |
| All | 2.4.7 Focus Visible | Custom focus ring: 2px --indigo-500 |
| All | 1.4.11 Non-text Contrast | UI components pass 3:1 minimum |

**Focus Ring Spec:**
```css
:focus-visible {
  outline: 2px solid #6366F1;
  outline-offset: 2px;
  border-radius: inherit;
}
```

---

## API Integration Patterns (Frontend)

### Supabase Realtime (Alert Queue)
```typescript
// Subscribe on component mount, cleanup on unmount
const channel = supabase
  .channel(`alerts:${orgId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'alerts',
    filter: `org_id=eq.${orgId}`
  }, (payload) => {
    alertStore.updateAlert(payload.new)
    flashRow(payload.new.id)  // trigger highlight animation
    announceUpdate(payload.new)  // aria-live
  })
  .subscribe()
```

### SSE (Agent Trace Streaming)
```typescript
// useAgentStream hook
const source = new EventSource(`/api/agents/l1/stream?alertId=${id}`)
source.onmessage = (e) => {
  const item = JSON.parse(e.data)
  agentStore.appendTrace(alertId, item)
  scrollLogToBottom()
}
source.onerror = () => {
  // silently reconnect after 3s, show "Reconnecting..." only after 5s
}
```

### Optimistic Updates (Approve/Reject)
```typescript
// Consequence approval — optimistic
const approve = async (actionId) => {
  // 1. Immediately update UI: button → loading spinner
  setApprovalState('pending')
  // 2. POST to API
  await fetch('/api/agents/l2/execute', {
    method: 'POST', body: JSON.stringify({ actionId, approved: true })
  })
  // 3. On success: update alert status via Realtime (let DB push the update)
  // 4. On error: revert + show error toast
}
```

---

## Responsive Design Breakpoints

```
Mobile  (< 768px):  Stack layout, no sidenav (bottom tab bar)
Tablet  (768-1280): Collapsed sidenav (icon only), single column
Desktop (> 1280px): Full 220px sidenav + main content
Wide    (> 1600px): Main content max-width 1400px, centered
```

**Mobile Alert Queue:**
- Card view instead of table
- Tap card → full-screen detail (not slide-in panel)
- ConsequencePanel: full-screen modal
- Bottom tab bar: Alerts, Hunt, Metrics, Settings

---

## Claude Design Handoff Notes

**Critical for Claude Design:**
1. Dark mode ONLY for this platform — `--bg-base: #0A0A0F` as the canvas
2. Electric Indigo `#6366F1` is the ONLY primary CTA color — nothing else competes
3. Severity colors are SACRED — never use red for anything other than CRITICAL
4. Monospace font for all IP addresses, hashes, domains, token counts
5. The ConsequencePanel blast radius diagram must be the visual ANCHOR of that view — make it large and unmissable
6. Agent trace items should feel like a terminal output — structured but readable
7. Söhne for all display numbers (MTTR, alert counts, confidence scores) — this is what makes it feel premium
8. Every empty state needs to feel like "the system is alive and watching" — not "nothing here yet"
9. The TRIAGING pulse animation is the most important micro-interaction — it signals real-time AI activity
10. Table rows should have generous 48px height minimum — analysts are reading fast under stress
