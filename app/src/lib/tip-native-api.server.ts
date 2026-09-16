type TipClaimInternalFetchOptions = {
  organizationId?: string;
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

export async function fetchTipClaimInternalJson<T>(
  request: Request,
  internalPath: string,
  userId: string,
  options: TipClaimInternalFetchOptions = {},
) {
  const url = new URL(`${getAuthBaseUrl(request)}${internalPath}`);
  url.searchParams.set("userId", userId);

  if (options.organizationId) {
    url.searchParams.set("organizationId", options.organizationId);
  }

  const response = await fetch(url, {
    headers: {
      "x-tip-claim-internal-secret": getInternalSecret(),
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}
