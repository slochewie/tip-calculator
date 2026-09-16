type TipClaimInternalFetchOptions = {
  organizationId?: string;
};

type TipClaimInternalRequestOptions = {
  organizationId?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

function getAuthBaseUrl(request: Request) {
  const hostname = new URL(request.url).hostname.toLowerCase();

  if (
    hostname === "mccarthysirishpub.com" ||
    hostname.endsWith(".mccarthysirishpub.com")
  ) {
    return "https://console.mccarthysirishpub.com";
  }

  if (hostname === "niteowl.dev" || hostname.endsWith(".niteowl.dev")) {
    return "https://console.niteowl.dev";
  }

  const configured = process.env.AUTH_BASE_URL ?? process.env.VITE_AUTH_BASE_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://console.niteowl.dev";
}

function getInternalSecret() {
  const internalSecret = process.env.TIP_CLAIM_INTERNAL_SECRET?.trim();

  if (!internalSecret) {
    throw new Error("TIP_CLAIM_INTERNAL_SECRET is not configured.");
  }

  return internalSecret;
}

function internalRequest(
  request: Request,
  internalPath: string,
  userId: string,
  options: TipClaimInternalRequestOptions = {},
) {
  const url = new URL(`${getAuthBaseUrl(request)}${internalPath}`);
  url.searchParams.set("userId", userId);

  if (options.organizationId) {
    url.searchParams.set("organizationId", options.organizationId);
  }

  const headers: Record<string, string> = {
    "x-tip-claim-internal-secret": getInternalSecret(),
  };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  return fetch(url, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });
}

export async function fetchTipClaimInternalJson<T>(
  request: Request,
  internalPath: string,
  userId: string,
  options: TipClaimInternalFetchOptions = {},
) {
  const response = await internalRequest(request, internalPath, userId, options);

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function forwardTipClaimInternalJson(
  request: Request,
  internalPath: string,
  userId: string,
  options: TipClaimInternalRequestOptions,
) {
  const response = await internalRequest(request, internalPath, userId, options);
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const result = (await response.json()) as unknown;

    return Response.json(result, { status: response.status });
  }

  const text = await response.text();

  if (text.length > 0) {
    return new Response(text, {
      status: response.status,
      headers: { "content-type": contentType || "text/plain" },
    });
  }

  return new Response(null, { status: response.status });
}
