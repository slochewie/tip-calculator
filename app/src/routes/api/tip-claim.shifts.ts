import { createFileRoute } from "@tanstack/react-router";

import {
  getAuthenticatedUserId,
  hasTipClaimScope,
} from "#/lib/tip-auth.server.ts";
import { fetchTipClaimInternalJson } from "#/lib/tip-native-api.server.ts";

type ShiftsResponse = {
  shifts?: unknown[];
  canManage?: boolean;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/tip-claim/shifts")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const userId = await getAuthenticatedUserId(request);

        if (!userId) {
          return jsonError("Unauthorized", 401);
        }

        if (!(await hasTipClaimScope(request, "tip-claim:read"))) {
          return jsonError("Insufficient scope", 403);
        }

        const url = new URL(request.url);
        const organizationId = url.searchParams.get("organizationId")?.trim();

        if (!organizationId) {
          return jsonError("organizationId is required", 400);
        }

        try {
          const result = await fetchTipClaimInternalJson<ShiftsResponse>(
            request,
            "/api/auth/tip-claim/shifts/internal",
            userId,
            { organizationId },
          );

          if (!result) {
            return jsonError("Unable to load Tip Calculator claim reports", 502);
          }

          return Response.json(result);
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to load Tip Calculator claim reports",
            502,
          );
        }
      },
    },
  },
});
