import { createFileRoute } from "@tanstack/react-router";

import {
  getAuthenticatedUserId,
  hasTipClaimScope,
} from "#/lib/tip-auth.server.ts";
import {
  fetchTipClaimInternalJson,
  forwardTipClaimInternalJson,
} from "#/lib/tip-native-api.server.ts";

type WeightPresetsResponse = {
  presets?: unknown[];
  canManage?: boolean;
};

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

async function requireAuthenticatedScope(request: Request, scope: string) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return { response: jsonError("Unauthorized", 401) };
  }

  if (!(await hasTipClaimScope(request, scope))) {
    return { response: jsonError("Insufficient scope", 403) };
  }

  return { userId };
}

export const Route = createFileRoute("/api/tip-claim/weight-presets")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const auth = await requireAuthenticatedScope(request, "tip-claim:read");

        if ("response" in auth) {
          return auth.response;
        }

        const url = new URL(request.url);
        const organizationId = url.searchParams.get("organizationId")?.trim();

        if (!organizationId) {
          return jsonError("organizationId is required", 400);
        }

        try {
          const result = await fetchTipClaimInternalJson<WeightPresetsResponse>(
            request,
            "/api/auth/tip-claim/weight-presets/internal",
            auth.userId,
            { organizationId },
          );

          if (!result) {
            return jsonError("Unable to load Tip Calculator weight presets", 502);
          }

          return Response.json(result);
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to load Tip Calculator weight presets",
            502,
          );
        }
      },

      POST: async ({ request }: { request: Request }) => {
        const auth = await requireAuthenticatedScope(request, "tip-claim:manage");

        if ("response" in auth) {
          return auth.response;
        }

        const body = await readJsonBody(request);

        if (!body) {
          return jsonError("JSON body is required", 400);
        }

        try {
          return await forwardTipClaimInternalJson(
            request,
            "/api/auth/tip-claim/weight-presets/internal",
            auth.userId,
            { method: "POST", body },
          );
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to save weight preset",
            502,
          );
        }
      },

      PATCH: async ({ request }: { request: Request }) => {
        const auth = await requireAuthenticatedScope(request, "tip-claim:manage");

        if ("response" in auth) {
          return auth.response;
        }

        const body = await readJsonBody(request);

        if (!body) {
          return jsonError("JSON body is required", 400);
        }

        try {
          return await forwardTipClaimInternalJson(
            request,
            "/api/auth/tip-claim/weight-presets/internal",
            auth.userId,
            { method: "PATCH", body },
          );
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to update weight preset",
            502,
          );
        }
      },

      DELETE: async ({ request }: { request: Request }) => {
        const auth = await requireAuthenticatedScope(request, "tip-claim:manage");

        if ("response" in auth) {
          return auth.response;
        }

        const body = await readJsonBody(request);

        if (!body) {
          return jsonError("JSON body is required", 400);
        }

        try {
          return await forwardTipClaimInternalJson(
            request,
            "/api/auth/tip-claim/weight-presets/internal",
            auth.userId,
            { method: "DELETE", body },
          );
        } catch (error: unknown) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Unable to delete weight preset",
            502,
          );
        }
      },
    },
  },
});
