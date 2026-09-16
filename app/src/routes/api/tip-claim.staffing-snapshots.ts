import { createFileRoute } from "@tanstack/react-router";

import {
  getAuthenticatedUserId,
  hasTipClaimScope,
} from "#/lib/tip-auth.server.ts";
import { forwardTipClaimInternalJson } from "#/lib/tip-native-api.server.ts";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/tip-claim/staffing-snapshots")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const userId = await getAuthenticatedUserId(request);

        if (!userId) {
          return jsonError("Unauthorized", 401);
        }

        if (!(await hasTipClaimScope(request, "tip-claim:manage"))) {
          return jsonError("Insufficient scope", 403);
        }

        const body = await readJsonBody(request);

        if (!body) {
          return jsonError("JSON body is required", 400);
        }

        try {
          return await forwardTipClaimInternalJson(
            request,
            "/api/auth/tip-claim/staffing-snapshots/internal",
            userId,
            { method: "POST", body },
          );
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to save temporary staffing",
            502,
          );
        }
      },
    },
  },
});
