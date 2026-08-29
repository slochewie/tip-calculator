import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authBaseURL =
  import.meta.env.VITE_AUTH_BASE_URL ??
  "https://console.mccarthysirishpub.com";

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  plugins: [
    organizationClient({
      teams: {
        enabled: true,
      },
    }),
  ],
});
