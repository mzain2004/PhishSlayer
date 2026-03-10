import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bodySchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  billingPeriod: z.enum(['monthly', 'annual']),
});

const PRICE_MAP: Record<string, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
  enterprise_annual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
};

export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Payments are not yet configured.' },
        { status: 503 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    let rawBody: unknown;
    try { rawBody = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const validation = bodySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid plan or billing period' }, { status: 400 });
    }

    const { plan, billingPeriod } = validation.data;
    const priceKey = `${plan}_${billingPeriod}`;
    const priceId = PRICE_MAP[priceKey];

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${priceKey}` },
        { status: 503 }
      );
    }

    // Dynamic Stripe import to avoid build errors when not installed
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(stripeKey);

    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        userId: user.id,
        plan,
        billingPeriod,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
