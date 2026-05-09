import { auth } from "@clerk/nextjs/server";
import { logger } from "./logger";

export async function withLogging(
  request: Request,
  route: string,
  handler: (ctx: {
    userId: string;
    orgId: string;
    requestId: string;
  }) => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { userId, orgId } = await auth();
  const start = Date.now();

  logger.info("request_start", {
    route,
    request_id: requestId,
    user_id: userId,
    org_id: orgId,
  });

  try {
    const response = await handler({
      userId: userId!,
      orgId: orgId!,
      requestId,
    });
    logger.info("request_complete", {
      route,
      request_id: requestId,
      user_id: userId,
      org_id: orgId,
      duration_ms: Date.now() - start,
    });
    return response;
  } catch (error) {
    logger.error("request_failed", {
      route,
      request_id: requestId,
      user_id: userId,
      org_id: orgId,
      duration_ms: Date.now() - start,
      error_code: "UNHANDLED_EXCEPTION",
    });
    throw error;
  }
}
