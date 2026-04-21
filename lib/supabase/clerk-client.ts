import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Creates a Supabase client authenticated with the Clerk JWT token.
 *
 * This allows Supabase RLS policies to use the Clerk user's identity
 * via the `auth.jwt() ->> 'sub'` claim, which maps to the Clerk user ID.
 *
 * SETUP REQUIRED:
 * 1. In Clerk Dashboard → JWT Templates → Create a "supabase" template
 * 2. Set the signing key to your SUPABASE_JWT_SECRET
 * 3. Add `sub` claim with value {{ user.id }}
 *
 * Then update your Supabase RLS policies:
 *   USING ((auth.jwt() ->> 'sub') = user_id::text)
 */
export async function createClerkSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
        },
      },
    },
  );
}

/**
 * Creates a Supabase service-role client (bypasses RLS entirely).
 * Use only for admin operations where Clerk JWT is not applicable.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
