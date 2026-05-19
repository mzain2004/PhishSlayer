Complete frontend revamp for PhishSlayer using Magic UI + shadcn/ui.
Implement the Claude Design ZIP files exactly. Follow brand guidelines strictly.
also here is the place of claude design files for refrence "D:\Phish Slayer\PhishSlayer"

## STEP 0 — INSTALL DEPENDENCIES

```bash
# shadcn/ui
npx shadcn@latest init --defaults
npx shadcn@latest add button card badge table tabs dialog sheet 
    separator skeleton tooltip progress slider switch input label
    dropdown-menu avatar scroll-area command popover

# Magic UI
npm install magic-ui
# OR install manually from magicui.design — these specific components:
# AnimatedBeam, BorderBeam, MagicCard, NumberTicker, 
# AnimatedGradientText, SparklesText, Shimmer, BlurIn,
# FadeText, WordPullUp, TypingAnimation, Meteors, GridPattern,
# ShimmerButton, RainbowButton, AnimatedShinyText, Ripple

# Fonts
npm install @fontsource/inter @fontsource/jetbrains-mono
```

## STEP 1 — BRAND TOKENS (OVERRIDE globals.css)

Replace ALL existing CSS variables with brand guidelines:

```css
:root {
  /* === BRAND COLORS (from guidelines — do not change) === */
  --bg-primary:    #080D12;   /* App background */
  --bg-surface:    #12151C;   /* Sidebar/panels/cards */
  --bg-elevated:   #1A1E28;   /* Elevated cards */
  --bg-hover:      #1E2330;   /* Hover states */
  --bg-border:     #30344A;   /* Borders */
  --bg-input:      #0E1219;   /* Input fields */

  --accent:        #7C5CFF;   /* Brand purple — primary CTA */
  --accent-hover:  #9175FF;   /* Accent hover */
  --accent-dim:    rgba(124,92,255,0.15); /* Dimmed accent bg */
  --accent-border: rgba(124,92,255,0.3);  /* Accent borders */

  /* Severity (from guidelines) */
  --critical:  #EF4444;
  --high:      #F97316;
  --medium:    #EAB308;
  --active:    #10B981;
  --low:       #6B7280;

  /* Text (from guidelines) */
  --text-primary:   #FFFFFF;
  --text-secondary: #A1A7B3;
  --text-tertiary:  #5C6270;
  --text-accent:    #7C5CFF;

  /* Status colors */
  --status-triaging:  #EAB308;
  --status-escalated: #F97316;
  --status-responded: #7C5CFF;
  --status-closed:    #10B981;
  --status-pending:   #4B5563;
  --status-fp:        #6B7280;

  /* Typography */
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}

/* Base */
* { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; }
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #4a4e66; }

/* Selection */
::selection { background: var(--accent); color: white; }

/* Monospace for technical data */
.mono, code, .ip-address, .hash, .alert-id {
  font-family: var(--font-mono);
  font-size: 12px;
}

/* Keep all existing keyframe animations */
```

## STEP 2 — UPDATE shadcn theme (components.json + tailwind.config)

Update tailwind.config.ts to use brand colors:

```typescript
const config = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: '#080D12',
        foreground: '#FFFFFF',
        card: { DEFAULT: '#12151C', foreground: '#FFFFFF' },
        primary: { DEFAULT: '#7C5CFF', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#1A1E28', foreground: '#A1A7B3' },
        muted: { DEFAULT: '#12151C', foreground: '#A1A7B3' },
        accent: { DEFAULT: '#7C5CFF', foreground: '#FFFFFF' },
        border: '#30344A',
        input: '#0E1219',
        ring: '#7C5CFF',
        destructive: { DEFAULT: '#EF4444', foreground: '#FFFFFF' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace'],
      },
      borderRadius: { lg: '8px', md: '6px', sm: '4px' },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #7C5CFF, #A855F7)',
        'card-gradient': 'linear-gradient(135deg, #12151C, #1A1E28)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-ring': 'pulse-ring 1.5s ease infinite',
        'fade-up': 'fade-up 0.5s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
}
```

## STEP 3 — SHARED LAYOUT COMPONENTS

### components/ui/Sidebar.tsx
Convert from components.jsx — keep ALL logic, upgrade visuals:

Enhancements:
- Use shadcn ScrollArea for nav items
- MagicCard effect on active nav item (subtle glow)
- AnimatedShinyText for "PhishSlayer" brand name
- BorderBeam on the sidebar right edge (subtle)
- Tooltip from shadcn on collapsed state icons
- Org switcher: shadcn Popover + Command for org search
- Keep collapse animation from design files
- Active item: left border accent + bg-accent-dim background

```tsx
// Nav item active state
<div className={cn(
  "flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer",
  "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)]",
  "transition-all duration-150",
  isActive && "text-white bg-[var(--accent-dim)] border-l-2 border-[var(--accent)]"
)}>
```

### components/ui/TopBar.tsx
- shadcn Command palette for ⌘K search (full keyboard nav)
- CMD CENTER button: ShimmerButton from Magic UI
- Notification bell: shadcn Popover with alert previews
- User avatar: shadcn Avatar with Clerk user image
- Org name: shadcn DropdownMenu

## STEP 4 — ALERT QUEUE PAGE (app/(dashboard)/alerts/page.tsx)

Source: screens.jsx AlertQueueScreen

Magic UI enhancements:
- New alert flash: use Ripple animation on row appear
- Empty state: use Meteors background
- Loading skeleton: shadcn Skeleton matching table columns
- Real-time indicator: animated pulse dot next to "Alerts" heading

shadcn components:
- Table, TableHeader, TableRow, TableCell for alert rows
- Badge for severity (CRITICAL/HIGH/MEDIUM/LOW)
- Badge for status (TRIAGING/ESCALATED/RESPONDED/PENDING)  
- Sheet for detail panel slide-in (right side)
- DropdownMenu for filter selectors
- Input for search

Severity badge colors (exact from brand guidelines):
```tsx
const severityConfig = {
  critical: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(249,115,22,0.15)', text: '#F97316', border: 'rgba(249,115,22,0.3)' },
  medium:   { bg: 'rgba(234,179,8,0.15)',  text: '#EAB308', border: 'rgba(234,179,8,0.3)' },
  low:      { bg: 'rgba(107,114,128,0.15)', text: '#6B7280', border: 'rgba(107,114,128,0.3)' },
}
```

Confidence bar: Progress from shadcn, colored by value:
- > 0.85: green (#10B981)
- 0.60-0.85: yellow (#EAB308)
- < 0.60: red (#EF4444)

IP addresses: always `font-mono text-xs`
Keep: keyboard nav (↑↓), realtime flash, age ticker

## STEP 5 — ALERT DETAIL PANEL (components/alerts/AlertDetailPanel.tsx)

Source: detail-panel.jsx DetailPanel

Magic UI enhancements:
- Panel slide-in: shadcn Sheet (right side, 42rem width)
- Timeline dots: animated with CSS pulse
- Tool call accordion: shadcn Collapsible
- L2 streaming badge: AnimatedShinyText "streaming"
- Token counter: NumberTicker animation
- Confidence bar: Progress + color coding
- "Open L3 Deep Hunt" button: ShimmerButton

shadcn: Sheet, Collapsible, Progress, Badge, Button, Separator

## STEP 6 — CONSEQUENCE PANEL (components/agents/ConsequencePanel.tsx)

Source: screens3.jsx ConsequenceModal + detail-panel.jsx ConsequencePanel

Magic UI: Ripple animation on approval buttons
shadcn: Dialog (modal), Progress, Badge, Button, Separator

Blast radius rings: SVG concentric circles
- User (center): #10B981
- Systems (ring 1): #EAB308  
- Department (ring 2): #F97316
- Org-wide (ring 3): #EF4444

Two-person approval: each button shows avatar + name
Keep: rollback steps list, blast scope labels

## STEP 7 — METRICS PAGE (app/(dashboard)/metrics/page.tsx)

Source: screens.jsx MetricsScreen

Magic UI:
- Stat cards: MagicCard with NumberTicker for values
- MTTR trending down: AnimatedGradientText "▼ 12%"
- Charts: Keep existing SVG or use recharts (already installed)

shadcn: Card, CardHeader, CardContent, Badge, Tabs (7d/30d/90d)

Stat cards format:
```tsx
<Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
  <CardContent className="p-4">
    <p className="text-xs font-semibold uppercase tracking-widest 
                  text-[var(--text-tertiary)] mb-2">MTTR</p>
    <NumberTicker value={4.2} className="text-3xl font-bold text-white" />
    <p className="text-xs text-[var(--active)] mt-1">▼ 12% vs last week</p>
  </CardContent>
</Card>
```

Agent performance table:
- shadcn Table
- Status badge: ACTIVE in green pill
- Latency: mono font

## STEP 8 — EVOLUTION PAGE (app/(dashboard)/evolution/page.tsx)

Source: screens.jsx EvolutionScreen

Magic UI:
- PROPOSED cards: MagicCard with subtle purple glow
- APPLIED cards: standard card with green left border
- REJECTED: muted gray

shadcn: Tabs (Timeline/Capabilities/HALO), Card, Badge, Button, Progress

Proposal cards: show OPENSPACE/EVOMAP/HALO source badge
Approve button: primary #7C5CFF
Reject button: ghost red

## STEP 9 — AGENTS PAGE (app/(dashboard)/agents/page.tsx)

Source: screens2.jsx AgentsScreen

Magic UI: BorderBeam on running agent cards
shadcn: Card, Slider (confidence threshold), Switch (toggles), Sheet (config drawer)

Agent cards:
- RUNNING status: green pulse dot
- L1 ⚡ L2 🛡 L3 🔬 icons kept
- Stats: processed/latency/tokens/conf in 2x2 grid
- Configure → Sheet slide-in with:
  - Slider for confidence threshold (0-1 range, step 0.01)
  - Slider for blast radius
  - Switch for RAG context
  - Switch for maintenance window

## STEP 10 — IOCS PAGE (app/(dashboard)/iocs/page.tsx)

Source: screens2.jsx IOCsScreen

shadcn: Table, Badge, DropdownMenu (filters), Input (search), Collapsible (expand row)

Expandable row shows: raw intel sources, related alerts, actions (whitelist/export/hunt)
IOC types: color-coded badges
  IP: blue, Domain: purple, Hash: red, Email: yellow

## STEP 11 — REPORTS PAGE (app/(dashboard)/reports/page.tsx)

Source: screens2.jsx ReportsScreen

Magic UI: ShimmerButton for "Generate Report"
shadcn: Card, Badge, Dialog (generate modal), Progress

Report type badges:
- EXECUTIVE: purple
- TECHNICAL: blue  
- COMPLIANCE: green
- THREAT INTEL: orange

Download buttons: PDF (red icon) + JSON (blue icon)

## STEP 12 — INTEGRATIONS PAGE (app/(dashboard)/settings/integrations/page.tsx)

Source: screens2.jsx IntegrationsScreen

shadcn: Card, Badge, Dialog (add key modal), Switch, Input (write-only)

Status badges:
- PS KEY: purple pill (using PhishSlayer default)
- CONNECTED: green pill (org has own key)
- NOT SET: gray pill (optional, not configured)

Categories as sections with headings:
- OSINT & THREAT INTEL
- SECURITY PLATFORMS  
- COMMUNICATION
- TICKETING & WORKFLOW

Tool card format:
```tsx
<Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] 
                  hover:border-[var(--accent-border)] transition-colors">
  <CardContent className="p-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-2xl">{tool.emoji}</span>
      <div>
        <p className="font-medium text-white">{tool.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{tool.desc}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <StatusBadge status={tool.status} />
      {tool.status === 'not_set' 
        ? <Button size="sm" variant="outline" onClick={() => openModal(tool)}>Add key</Button>
        : <Button size="sm" variant="ghost">Rotate key</Button>
      }
    </div>
  </CardContent>
</Card>
```

## STEP 13 — SETTINGS PAGE (app/(dashboard)/settings/page.tsx)

Source: screens3.jsx SettingsScreenV2

shadcn: Card, Badge, Dialog (invite modal), Input, Select, Avatar, Separator

Sections: Wazuh / Microsoft Graph / Polar Billing / Team
Team table: shadcn Table with role Select dropdown

## STEP 14 — HUNTING PAGE (app/(dashboard)/hunting/page.tsx)

Source: screens.jsx HuntScreen

Magic UI: TypingAnimation for live log output
shadcn: Card, Badge, Progress (phase completion), ScrollArea (live log)

Phase indicator: Reader → Hunter → Reviewer
- Running: purple animated ring
- Pending: gray hollow
- Done: green checkmark

Live log: monospace, green text on dark bg, auto-scroll

## STEP 15 — ONBOARDING (app/onboarding/page.tsx)

Source: screens3.jsx OnboardingScreenV2

Magic UI: AnimatedGradientText for "You're ready" step
shadcn: Card, Progress (step indicator), Button, Badge

Keep ALL logic from source:
- handleTest() setTimeout 2200ms simulation
- handleCopy() setTimeout 1400ms
- step state machine (1→2→3)

## STEP 16 — REMOVE CHATBOT

Search entire codebase for chatbot widget:
```bash
grep -rn "chatbot\|tawk\|intercom\|crisp\|drift\|freshchat\|chat-widget\|floating.*chat\|chat.*floating\|Chatbot\|LiveChat" app/ components/ --include="*.tsx" --include="*.ts" --include="*.jsx"
```

Remove ALL occurrences:
- Any script tags loading external chat
- Any React components rendering chat widget
- Any useEffect loading chat scripts
- The floating button visible in screenshot (bottom right)

## STEP 17 — LANDING PAGE UPDATE (app/page.tsx)

Apply Magic UI to existing landing page:
- Hero headline: SparklesText or WordPullUp
- Stat bar: NumberTicker for each number
- Feature cards: MagicCard
- CTA buttons: ShimmerButton (primary) + RainbowButton (demo)
- Background: GridPattern from Magic UI
- Pricing cards: MagicCard with BorderBeam on recommended tier

## STEP 18 — AUTH PAGES

app/sign-in/[[...sign-in]]/page.tsx
app/sign-up/[[...sign-up]]/page.tsx

Background: GridPattern from Magic UI
Logo above Clerk form
Heading: BlurIn animation
Clerk appearance using brand colors:
  colorPrimary: '#7C5CFF'
  colorBackground: '#12151C'
  colorText: '#FFFFFF'
  colorTextSecondary: '#A1A7B3'
  colorInputBackground: '#0E1219'

## STEP 19 — TYPOGRAPHY RULES (enforce everywhere)

Brand guidelines mandatory:
- Page titles: font-semibold text-2xl (Inter)
- Table headers: text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]
- Body: text-sm text-[var(--text-secondary)]
- IP addresses, hashes, IDs, logs: font-mono text-xs text-white
- Severity/status badges: text-xs font-bold uppercase
- Buttons: font-medium

## STEP 20 — VALIDATION

```bash
npm run build  # must pass 0 errors
```

Check:
- No raw error.message in any API response
- All dashboard routes require auth (middleware.ts unchanged)
- Chatbot completely removed
- All pages render without console errors
- Mobile responsive (md: breakpoint at minimum)
- Brand purple #7C5CFF used for ALL primary actions
- JetBrains Mono on ALL IP addresses, hashes, IDs
- Never modify server.js or middleware.ts
- Never overwrite .env files
- Product name: PhishSlayer (no hyphen, no space)