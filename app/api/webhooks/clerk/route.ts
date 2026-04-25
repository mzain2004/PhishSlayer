import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!CLERK_WEBHOOK_SECRET) {
    console.error('CRITICAL ERROR: CLERK_WEBHOOK_SECRET is not defined in environment variables.')
    return new Response('Error: CLERK_WEBHOOK_SECRET is not defined', {
      status: 500,
    })
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(CLERK_WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error: Webhook verification failed', err)
    return new Response('Error: Verification failed', {
      status: 400,
    })
  }

  const supabase = await createClient()

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, created_at } = evt.data
    const email = email_addresses[0]?.email_address

    const { error } = await supabase.from('users').insert({
      id: id,
      email: email,
      created_at: new Date(created_at).toISOString(),
    })

    if (error) {
      console.error('Error syncing user created:', error)
      return new Response('Error: Failed to sync user created', { status: 400 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    const { error } = await supabase.from('users').delete().eq('id', id)

    if (error) {
      console.error('Error syncing user deleted:', error)
      return new Response('Error: Failed to sync user deleted', { status: 400 })
    }
  }

  return new Response('Webhook processed successfully', { status: 200 })
}
