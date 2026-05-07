import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ENCRYPTION_KEY = process.env.CONNECTOR_ENCRYPTION_KEY || 'default-key-32-chars-long-1234567'; // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const connectorSchema = z.object({
  vendor: z.string(),
  connector_type: z.enum(['edr', 'siem', 'firewall', 'wazuh']),
  display_name: z.string(),
  config: z.record(z.string(), z.any()),
});

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('connector_configs')
    .select('*')
    .eq('organization_id', orgId);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

  // Sanitize config before returning (remove sensitive fields)
  const sanitized = data.map(c => ({
    ...c,
    config: Object.keys(c.config).reduce((acc: any, key) => {
      acc[key] = '[ENCRYPTED]';
      return acc;
    }, {})
  }));

  return NextResponse.json(sanitized);
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = connectorSchema.parse(body);

    // Encrypt sensitive config fields (anything that looks like a secret)
    const encryptedConfig: any = {};
    for (const [key, value] of Object.entries(validated.config)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('key') || lowerKey.includes('password')) {
        encryptedConfig[key] = encrypt(String(value));
      } else {
        encryptedConfig[key] = value;
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('connector_configs')
      .insert({
        organization_id: orgId,
        vendor: validated.vendor,
        connector_type: validated.connector_type,
        display_name: validated.display_name,
        config: encryptedConfig,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 400 });
  }
}
