interface UserAgentProfile {
  name: string
  ua: string
  type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'security_researcher'
}

interface FetchResult {
  status: number
  body: string
  final_url: string
  redirect_chain: string[]
  content_type: string
  response_time_ms: number
}

export interface MobilePhishingFindings {
  mobile_gets_different_content: boolean
  bot_gets_blocked: boolean
  desktop_gets_blocked: boolean
  different_redirect_chains: boolean
  mobile_shows_login_form: boolean
  mobile_shows_payment_form: boolean
  htaccess_ua_filtering: boolean
  geolocation_redirect: boolean
  mobile_specific_phishing_kit: boolean
  twitter_t_co_referrer: boolean
  password_field_mobile_only: boolean
  credential_keywords_mobile: string[]
  suspicious_form_targets: string[]
}

export interface MobilePhishingEvidence {
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

export interface MobilePhishingResult {
  url: string
  scanned_at: string
  is_mobile_phishing: boolean
  risk_score: number
  findings: MobilePhishingFindings
  evidence: MobilePhishingEvidence
  recommendation: string
}

const USER_AGENTS: UserAgentProfile[] = [
  {
    name: 'desktop_chrome',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    type: 'desktop',
  },
  {
    name: 'iphone_safari',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    type: 'mobile',
  },
  {
    name: 'android_chrome',
    ua: 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    type: 'mobile',
  },
  {
    name: 'security_researcher',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    type: 'security_researcher',
  },
]

export async function detectMobilePhishing(targetUrl: string): Promise<MobilePhishingResult> {
  const scannedAt = new Date().toISOString()

  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs allowed')
    }
    const hostname = parsedUrl.hostname
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)) {
      throw new Error('Private/internal URLs not allowed')
    }
  } catch (e) {
    throw new Error(`Invalid URL: ${e}`)
  }

  const fetchPromises = USER_AGENTS.map(profile => fetchWithUserAgent(targetUrl, profile))
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
  const mobile = iphoneSafari ?? androidChrome

  const findings: MobilePhishingFindings = {
    mobile_gets_different_content: !!(
      mobile && desktop &&
      mobile.body.length > 200 &&
      calculateSimilarity(desktop.body, mobile.body) < 0.7
    ),

    bot_gets_blocked: !!(
      bot && mobile &&
      (bot.status === 403 || bot.status === 401 || bot.body.length < 200) &&
      mobile.body.length > 500
    ),

    desktop_gets_blocked: !!(
      desktop && mobile &&
      (desktop.status === 403 || desktop.body.length < 200) &&
      mobile.status === 200 && mobile.body.length > 500
    ),

    different_redirect_chains: !!(
      desktop && mobile &&
      desktop.final_url !== mobile.final_url
    ),

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

    htaccess_ua_filtering: !!(
      mobile && (
        mobile.body.includes('.htaccess') ||
        mobile.body.includes('user_agent') ||
        mobile.body.includes('rand.php') ||
        mobile.body.includes('mobile.php')
      )
    ),

    geolocation_redirect: !!(
      iphoneSafari && androidChrome &&
      iphoneSafari.final_url !== androidChrome.final_url
    ),

    mobile_specific_phishing_kit: !!(
      mobile && (
        /PayPal|Apple ID|Bank of America|Chase|Wells Fargo/i.test(mobile.body) &&
        mobile.body.includes('verify') &&
        mobile.body.toLowerCase().includes('type="password"')
      )
    ),

    twitter_t_co_referrer: targetUrl.includes('t.co') || !!(mobile?.final_url.includes('t.co')),

    password_field_mobile_only: !!(
      mobile && desktop &&
      mobile.body.toLowerCase().includes('type="password"') &&
      !desktop.body.toLowerCase().includes('type="password"')
    ),

    credential_keywords_mobile: extractCredentialKeywords(
      mobile?.body ?? '',
      desktop?.body ?? ''
    ),

    suspicious_form_targets: extractSuspiciousFormTargets(
      mobile?.body ?? '',
      parsedUrl.hostname
    ),
  }

  const signalWeights: Record<keyof MobilePhishingFindings, number> = {
    mobile_gets_different_content: 20,
    bot_gets_blocked: 25,
    desktop_gets_blocked: 30,
    different_redirect_chains: 20,
    mobile_shows_login_form: 35,
    mobile_shows_payment_form: 35,
    htaccess_ua_filtering: 15,
    geolocation_redirect: 15,
    mobile_specific_phishing_kit: 40,
    twitter_t_co_referrer: 10,
    password_field_mobile_only: 30,
    credential_keywords_mobile: 0,
    suspicious_form_targets: 0,
  }

  let riskScore = 0
  for (const [signal, weight] of Object.entries(signalWeights)) {
    const value = findings[signal as keyof MobilePhishingFindings]
    if (typeof value === 'boolean' && value) {
      riskScore += weight
    }
  }

  riskScore += Math.min(findings.credential_keywords_mobile.length * 5, 20)
  riskScore += Math.min(findings.suspicious_form_targets.length * 8, 15)
  riskScore = Math.min(riskScore, 100)

  const isMobilePhishing = riskScore >= 40

  const positiveSignals = Object.entries(findings)
    .filter(([, v]) => typeof v === 'boolean' && v)
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
    signal: AbortSignal.timeout(6000),
  })

  const bodyText = (await response.text()).slice(0, 5120)
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
    'your account has been', 'security alert', 'immediately',
  ]
  const mobileLower = mobileBody.toLowerCase()
  const desktopLower = desktopBody.toLowerCase()
  return phishingKeywords.filter(kw => mobileLower.includes(kw) && !desktopLower.includes(kw))
}

function extractSuspiciousFormTargets(html: string, targetHostname: string): string[] {
  const formActionRegex = /<form[^>]+action=["']([^"']+)["']/gi
  const targets: string[] = []
  let match
  while ((match = formActionRegex.exec(html)) !== null) {
    const action = match[1]
    if (action.startsWith('http') && !action.includes(targetHostname)) {
      targets.push(action)
    }
    if (/successfully\.php|results\.php|post\.php|send\.php|process\.php/i.test(action)) {
      targets.push(action)
    }
  }
  return targets
}
