import { createFileRoute } from "@tanstack/react-router";

import {
  getAuthenticatedUserId,
  getAvailableTipClaimOrganizations,
  hasTipClaimScope,
} from "#/lib/tip-auth.server.ts";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/tip-claim/available")({
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

        try {
          const organizations = await getAvailableTipClaimOrganizations(request);

          if (!organizations) {
            return jsonError("Unable to load Tip Calculator access", 502);
          }

          return Response.json({ organizations });
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to load available Tip Calculator organizations",
            502,
          );
        }
      },
    },
  },
});
