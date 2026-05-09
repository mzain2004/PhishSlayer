import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const alertId = request.nextUrl.searchParams.get("alert_id");
  if (!alertId) {
    return NextResponse.json({ error: "Missing alert_id" }, { status: 400 });
  }

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const channel = `agent-trace:${alertId}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let client: any;
      try {
        // Dynamic import so Next build doesn't fail when redis isn't bundled
        const { createClient: createRedis } = await import("redis");
        client = createRedis({ url: redisUrl });
        await client.connect();

        await client.subscribe(channel, (message: string) => {
          const data = `data: ${message}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Close stream on terminal events
          try {
            const parsed = JSON.parse(message);
            if (parsed.event === "done" || parsed.event === "error") {
              controller.close();
              client.unsubscribe(channel).then(() => client.disconnect());
            }
          } catch {
            // non-JSON message — ignore
          }
        });

        // Heartbeat every 15s to keep connection alive
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 15000);

        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          client.unsubscribe(channel).then(() => client.disconnect()).catch(() => {});
          controller.close();
        });
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "error", error: "STREAM_INIT_FAILED" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
