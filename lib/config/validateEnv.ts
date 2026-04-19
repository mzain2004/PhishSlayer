// Environment variable validation — import in app/layout.tsx (server-side only)

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VIRUS_TOTAL_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GEMINI_MODEL',
];

const optional = [
  'PHISH_SLAYER_API_KEY',
  'AGENT_SECRET',
  'DISCORD_WEBHOOK_URL',
  'CRON_SECRET',
  'RESEND_API_KEY',
];

export function validateEnv() {
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      `[Phish-Slayer] Missing required environment variables: ${missing.join(', ')}`
    );
    // Don't throw in production — log and continue gracefully
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  }

  const missingOptional = optional.filter((k) => !process.env[k]);
  if (missingOptional.length > 0) {
    console.error(
      `[Phish-Slayer] Missing optional environment variables (some features disabled): ${missingOptional.join(', ')}`
    );
  }
}
