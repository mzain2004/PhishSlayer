/caveman

Two features. Both in one session. Start with mobile phishing, then TLP badges.
After both: npm run build passes. Single commit at end.

══════════════════════════════════════════════════════════
SECTION A: MOBILE PHISHING DETECTION IN URL SCANNER
══════════════════════════════════════════════════════════

Find the URL scanner functionality. Search for:
  - "urlscan" or "scan_url" or "url_scanner" or "checkUrl" in codebase
  - API route handling URL analysis (likely /api/scanner or /api/urls/scan)
  
If PhishSlayer has a URL scanning feature, enhance it.
If no URL scanner exists yet, create app/api/scanner/route.ts + the service below.

Create lib/services/mobile-phishing-detector.ts:

  interface UserAgentProfile {
    name: string
    ua: string
    type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'security_researcher'
  }
  
  interface FetchResult {
    status: number
    body: string          // first 5KB only
    final_url: string    // after redirects
    redirect_chain: string[]
    content_type: string
    response_time_ms: number
  }
  
  interface MobilePhishingResult {
    url: string
    scanned_at: string
    is_mobile_phishing: boolean
    risk_score: number    // 0-100
    findings: MobilePhishingFindings
    evidence: MobilePhishingEvidence
    recommendation: string
  }
  
  interface MobilePhishingFindings {
    // Core detection signals
    mobile_gets_different_content: boolean    // Different HTML served to mobile
    bot_gets_blocked: boolean                 // Security researcher/bot blocked
    desktop_gets_blocked: boolean             // Desktop blocked, mobile allowed  
    different_redirect_chains: boolean        // Mobile and desktop redirected differently
    mobile_shows_login_form: boolean          // Mobile gets credential harvest page
    mobile_shows_payment_form: boolean        // Mobile gets payment page
    
    // Advanced signals
    htaccess_ua_filtering: boolean            // Evidence of user-agent based .htaccess blocking
    geolocation_redirect: boolean             // Different countries get different content
    mobile_specific_phishing_kit: boolean     // Known mobile phishing kit patterns in HTML
    twitter_t_co_referrer: boolean            // Common mobile phishing distribution vector
    
    // Content analysis
    password_field_mobile_only: boolean       // Password input only appears in mobile response
    credential_keywords_mobile: string[]      // Keywords like "verify", "secure", "account" in mobile only
    suspicious_form_targets: string[]         // Form action URLs that look malicious
  }
  
  interface MobilePhishingEvidence {
    desktop_status: number
    mobile_status: number
    bot_status: number
    desktop_final_url: string
    mobile_final_url: string
    desktop_body_length: number
    mobile_body_length: number
    desktop_has_password_field: boolean
    mobile_has_password_field: boolean
    mobile_redirect_chain: string[]
    desktop_redirect_chain: string[]
  }
  
  const USER_AGENTS: UserAgentProfile[] = [
    {
      name: 'desktop_chrome',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      type: 'desktop'
    },
    {
      name: 'iphone_safari',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      type: 'mobile'
    },
    {
      name: 'android_chrome',
      ua: 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      type: 'mobile'
    },
    {
      name: 'security_researcher',
      ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      type: 'security_researcher'
    }
  ]
  
  export async function detectMobilePhishing(targetUrl: string): Promise<MobilePhishingResult> {
    const scannedAt = new Date().toISOString()
    
    // Validate URL before fetching
    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrl)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs allowed')
      }
      // Block private/internal IPs
      const hostname = parsedUrl.hostname
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)) {
        throw new Error('Private/internal URLs not allowed')
      }
    } catch (e) {
      throw new Error(`Invalid URL: ${e}`)
    }
    
    // Fetch URL with each user agent concurrently
    const fetchPromises = USER_AGENTS.map(profile => 
      fetchWithUserAgent(targetUrl, profile)
    )
    
    const results = await Promise.allSettled(fetchPromises)
    
    const fetchResults: Record<string, FetchResult | null> = {}
    USER_AGENTS.forEach((profile, i) => {
      const result = results[i]
      fetchResults[profile.name] = result.status === 'fulfilled' ? result.value : null
    })
    
    const desktop = fetchResults['desktop_chrome']
    const iphoneSafari = fetchResults['iphone_safari']
    const androidChrome = fetchResults['android_chrome']
    const bot = fetchResults['security_researcher']
    
    // Use iPhone as primary mobile result
    const mobile = iphoneSafari || androidChrome
    
    // DETECTION SIGNALS
    const findings: MobilePhishingFindings = {
      // Core: mobile gets different content
      mobile_gets_different_content: !!(
        mobile && desktop &&
        mobile.body.length > 200 &&
        calculateSimilarity(desktop.body, mobile.body) < 0.7 // less than 70% similar
      ),
      
      // Bot/security researcher blocked while mobile allowed
      bot_gets_blocked: !!(
        bot && mobile &&
        (bot.status === 403 || bot.status === 401 || bot.body.length < 200) &&
        mobile.body.length > 500
      ),
      
      // Desktop blocked while mobile allowed (aggressive phisher)
      desktop_gets_blocked: !!(
        desktop && mobile &&
        (desktop.status === 403 || desktop.body.length < 200) &&
        mobile.status === 200 && mobile.body.length > 500
      ),
      
      // Different redirect chains
      different_redirect_chains: !!(
        desktop && mobile &&
        desktop.final_url !== mobile.final_url
      ),
      
      // Mobile shows login/credential harvest page
      mobile_shows_login_form: !!(
        mobile && (
          mobile.body.toLowerCase().includes('type="password"') ||
          mobile.body.toLowerCase().includes('name="password"') ||
          mobile.body.toLowerCase().includes('id="password"')
        ) && (
          !desktop ||
          !desktop.body.toLowerCase().includes('type="password"')
        )
      ),
      
      // Mobile shows payment form
      mobile_shows_payment_form: !!(
        mobile && (
          mobile.body.includes('card') ||
          mobile.body.includes('cvv') ||
          mobile.body.includes('billing')
        ) && (
          !desktop ||
          (!desktop.body.includes('card') && !desktop.body.includes('cvv'))
        )
      ),
      
      // UA filtering patterns in HTML (phishing kit signature)
      htaccess_ua_filtering: !!(
        mobile &&
        (mobile.body.includes('.htaccess') ||
         mobile.body.includes('user_agent') ||
         mobile.body.includes('rand.php') ||   // common in PayPal phishing kits
         mobile.body.includes('mobile.php'))
      ),
      
      // Redirect to different final URL based on device
      geolocation_redirect: !!(
        iphoneSafari && androidChrome &&
        iphoneSafari.final_url !== androidChrome.final_url
      ),
      
      // Known mobile phishing kit signatures
      mobile_specific_phishing_kit: !!(
        mobile && (
          /PayPal|Apple ID|Bank of America|Chase|Wells Fargo/i.test(mobile.body) &&
          mobile.body.includes('verify') &&
          mobile.body.toLowerCase().includes('type="password"')
        )
      ),
      
      // Twitter t.co referrer (common in mobile phishing distribution)
      twitter_t_co_referrer: targetUrl.includes('t.co') || !!(
        mobile?.final_url.includes('t.co')
      ),
      
      // Password field appears ONLY in mobile
      password_field_mobile_only: !!(
        mobile && desktop &&
        mobile.body.toLowerCase().includes('type="password"') &&
        !desktop.body.toLowerCase().includes('type="password"')
      ),
      
      // Suspicious keywords in mobile only
      credential_keywords_mobile: extractCredentialKeywords(
        mobile?.body || '',
        desktop?.body || ''
      ),
      
      // Form action URLs that look malicious
      suspicious_form_targets: extractSuspiciousFormTargets(mobile?.body || ''),
    }
    
    // SCORING
    const signalWeights: Record<keyof MobilePhishingFindings, number> = {
      mobile_gets_different_content: 20,
      bot_gets_blocked: 25,
      desktop_gets_blocked: 30,
      different_redirect_chains: 20,
      mobile_shows_login_form: 35,       // highest weight — direct evidence of phishing
      mobile_shows_payment_form: 35,
      htaccess_ua_filtering: 15,
      geolocation_redirect: 15,
      mobile_specific_phishing_kit: 40,  // known kit = almost certain phishing
      twitter_t_co_referrer: 10,
      password_field_mobile_only: 30,
      credential_keywords_mobile: 0,     // handled separately below
      suspicious_form_targets: 0,        // handled separately below
    }
    
    let riskScore = 0
    for (const [signal, weight] of Object.entries(signalWeights)) {
      const value = findings[signal as keyof MobilePhishingFindings]
      if (typeof value === 'boolean' && value) {
        riskScore += weight
      }
    }
    
    // Keyword hits contribute up to 20 points
    riskScore += Math.min(findings.credential_keywords_mobile.length * 5, 20)
    // Suspicious form targets contribute up to 15 points
    riskScore += Math.min(findings.suspicious_form_targets.length * 8, 15)
    
    riskScore = Math.min(riskScore, 100)
    
    const isMobilePhishing = riskScore >= 40
    
    const positiveSignals = Object.entries(findings)
      .filter(([k, v]) => typeof v === 'boolean' && v)
      .map(([k]) => k.replace(/_/g, ' '))
    
    const recommendation = isMobilePhishing
      ? `HIGH RISK: ${positiveSignals.length} mobile phishing signals detected. Submit to PhishTank and Google Safe Browsing. Block at DNS/firewall. Score: ${riskScore}/100.`
      : riskScore >= 20
        ? `MEDIUM RISK: Some suspicious signals (${positiveSignals.join(', ')}). Manual review recommended. Score: ${riskScore}/100.`
        : `LOW RISK: No significant mobile phishing indicators. Score: ${riskScore}/100.`
    
    return {
      url: targetUrl,
      scanned_at: scannedAt,
      is_mobile_phishing: isMobilePhishing,
      risk_score: riskScore,
      findings,
      evidence: {
        desktop_status: desktop?.status ?? 0,
        mobile_status: mobile?.status ?? 0,
        bot_status: bot?.status ?? 0,
        desktop_final_url: desktop?.final_url ?? '',
        mobile_final_url: mobile?.final_url ?? '',
        desktop_body_length: desktop?.body.length ?? 0,
        mobile_body_length: mobile?.body.length ?? 0,
        desktop_has_password_field: !!(desktop?.body.toLowerCase().includes('type="password"')),
        mobile_has_password_field: !!(mobile?.body.toLowerCase().includes('type="password"')),
        mobile_redirect_chain: mobile?.redirect_chain ?? [],
        desktop_redirect_chain: desktop?.redirect_chain ?? [],
      },
      recommendation,
    }
  }
  
  async function fetchWithUserAgent(url: string, profile: UserAgentProfile): Promise<FetchResult> {
    const start = Date.now()
    const redirectChain: string[] = []
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': profile.ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),  // 6 second timeout per UA
    })
    
    const bodyText = (await response.text()).slice(0, 5120)  // first 5KB
    const responseTime = Date.now() - start
    
    return {
      status: response.status,
      body: bodyText,
      final_url: response.url,
      redirect_chain: redirectChain,
      content_type: response.headers.get('content-type') ?? '',
      response_time_ms: responseTime,
    }
  }
  
  function calculateSimilarity(a: string, b: string): number {
    // Simple similarity: ratio of common words
    // Not perfect but fast and good enough for detection
    const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3))
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3))
    if (wordsA.size === 0 || wordsB.size === 0) return 0
    let common = 0
    for (const w of wordsA) {
      if (wordsB.has(w)) common++
    }
    return common / Math.max(wordsA.size, wordsB.size)
  }
  
  function extractCredentialKeywords(mobileBody: string, desktopBody: string): string[] {
    const phishingKeywords = [
      'verify your account', 'confirm your identity', 'unusual activity',
      'suspended', 'verify now', 'update your information',
      'limited', 'click here to verify', 'sign in to continue',
      'your account has been', 'security alert', 'immediately'
    ]
    const mobileLower = mobileBody.toLowerCase()
    const desktopLower = desktopBody.toLowerCase()
    
    return phishingKeywords.filter(kw => 
      mobileLower.includes(kw) && !desktopLower.includes(kw)
    )
  }
  
  function extractSuspiciousFormTargets(html: string): string[] {
    const formActionRegex = /<form[^>]+action=["']([^"']+)["']/gi
    const targets: string[] = []
    let match
    while ((match = formActionRegex.exec(html)) !== null) {
      const action = match[1]
      // Flag if action posts to external/suspicious domain
      if (action.startsWith('http') && !action.includes(window?.location?.hostname ?? 'localhost')) {
        targets.push(action)
      }
      // Flag PHP files common in phishing kits
      if (/successfully\.php|results\.php|post\.php|send\.php|process\.php/i.test(action)) {
        targets.push(action)
      }
    }
    return targets
  }

Wire into URL scanner API route (existing or new at app/api/scanner/route.ts):
  import { detectMobilePhishing } from '@/lib/services/mobile-phishing-detector'
  
  // In POST handler, after existing scan logic:
  const mobilePhishResult = await detectMobilePhishing(scanUrl)
  
  // Include in scan result response:
  return NextResponse.json({
    // ...existing scan result fields
    mobile_phishing: mobilePhishResult,
  })

══════════════════════════════════════════════
SECTION B: TLP BADGES + PROTOCOL UI ACROSS APP
══════════════════════════════════════════════

Create components/ui/TLPBadge.tsx:

  'use client'
  
  import { cn } from '@/lib/utils'
  
  export type TLPLevel = 'white' | 'green' | 'amber' | 'red'
  
  const TLP_CONFIG: Record<TLPLevel, {
    label: string
    bg: string
    text: string
    border: string
    description: string
  }> = {
    white: {
      label: 'TLP:WHITE',
      bg: 'bg-white dark:bg-gray-100',
      text: 'text-gray-900',
      border: 'border-gray-300',
      description: 'Unrestricted. May be distributed freely.',
    },
    green: {
      label: 'TLP:GREEN',
      bg: 'bg-green-600',
      text: 'text-white',
      border: 'border-green-700',
      description: 'Community. Share within your industry community.',
    },
    amber: {
      label: 'TLP:AMBER',
      bg: 'bg-amber-500',
      text: 'text-white',
      border: 'border-amber-600',
      description: 'Limited. Share with your organization on need-to-know.',
    },
    red: {
      label: 'TLP:RED',
      bg: 'bg-red-600',
      text: 'text-white',
      border: 'border-red-700',
      description: 'Restricted. Named recipients only. Do not forward.',
    },
  }
  
  interface TLPBadgeProps {
    level: TLPLevel
    size?: 'sm' | 'md' | 'lg'
    showTooltip?: boolean
    className?: string
  }
  
  export function TLPBadge({
    level,
    size = 'sm',
    showTooltip = true,
    className,
  }: TLPBadgeProps) {
    const config = TLP_CONFIG[level] ?? TLP_CONFIG.amber
    
    const sizeClasses = {
      sm: 'px-1.5 py-0.5 text-xs',
      md: 'px-2 py-1 text-sm',
      lg: 'px-3 py-1 text-base',
    }
    
    return (
      <span
        className={cn(
          'inline-flex items-center font-mono font-bold rounded border cursor-default select-none',
          config.bg,
          config.text,
          config.border,
          sizeClasses[size],
          className,
        )}
        title={showTooltip ? config.description : undefined}
        aria-label={`Traffic Light Protocol: ${config.label} — ${config.description}`}
      >
        {config.label}
      </span>
    )
  }
  
  // TLP selector component for forms
  interface TLPSelectorProps {
    value: TLPLevel
    onChange: (level: TLPLevel) => void
    disabled?: boolean
    className?: string
  }
  
  export function TLPSelector({ value, onChange, disabled, className }: TLPSelectorProps) {
    const levels: TLPLevel[] = ['white', 'green', 'amber', 'red']
    
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          TLP Classification
        </label>
        <div className="flex gap-2 flex-wrap">
          {levels.map(level => (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={cn(
                'transition-all duration-150',
                value === level
                  ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-105'
                  : 'opacity-50 hover:opacity-80',
              )}
              title={TLP_CONFIG[level].description}
            >
              <TLPBadge level={level} size="md" showTooltip={false} />
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {TLP_CONFIG[value]?.description}
        </p>
      </div>
    )
  }

Add TLPBadge to these locations:

LOCATION 1 — Alert list/feed items (left column in Mission Control):
  Find the alert card/row component. Import TLPBadge.
  Add after severity badge:
  <TLPBadge level={alert.tlp_level ?? 'amber'} size="sm" />

LOCATION 2 — Alert detail header:
  Find the alert detail component or drawer.
  Add TLPBadge prominently near the title (size="md").

LOCATION 3 — Intelligence/IOC table rows:
  Find the IOC table component.
  Add TLP column:
  <td><TLPBadge level={ioc.tlp_level ?? 'amber'} size="sm" /></td>

LOCATION 4 — Report list/cards:
  Find the reports list component.
  Add TLPBadge to each report card/row.

LOCATION 5 — Manual IOC creation form:
  Find the form where analysts can add IOCs manually.
  Import TLPSelector.
  Add TLPSelector component with default 'amber'.
  Include tlp_level in form submission data.

LOCATION 6 — Report generation UI (if exists):
  Add TLPSelector when initiating report generation.
  Default: tactical=amber, operational=amber, strategic=green.

════════════════════════════
FINAL VALIDATION (Phase 4)
════════════════════════════

1. npm run build — zero errors
2. TypeScript: tsc --noEmit — zero errors
3. Verify TLPBadge renders in Storybook or browser (if dev server available)
4. Verify mobile phishing detector doesn't crash on malformed URLs:
   - Test with: "not-a-url" → should throw cleanly
   - Test with: "http://localhost/test" → should reject (private IP)
   - Test with valid URL → should return MobilePhishingResult shape

git add -A
git commit -m "feat: mobile phishing detection (user-agent differential analysis) + TLP protocol badges across UI (Phase 4 complete)"