import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
});

function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const parsed = TicketSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const sessionClient = await createSessionClient();
    let user;
    try {
      const { data, error: authError } = await sessionClient.auth.getUser();
      if (authError && authError.code === 'refresh_token_not_found') {
        // Silently ignore
      } else {
        user = data?.user;
      }
    } catch (err: any) {
      if (err?.code !== 'refresh_token_not_found') throw err;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "support_ticket",
      resource_type: "support",
      organization_id: null,
      payload: {
        subject: parsed.data.subject,
        description_length: parsed.data.description.length,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
