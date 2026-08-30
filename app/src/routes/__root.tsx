import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'

import { AppChrome } from '../components/app-chrome'
import { ThemeSwitcher } from '../components/theme-switcher'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Tip Claim Calculator',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const usesAuthenticatedChrome =
    location.pathname === '/app' || location.pathname === '/reports'

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {usesAuthenticatedChrome ? (
          <AppChrome>{children}</AppChrome>
        ) : (
          <>
            <ThemeSwitcher />
            {children}
          </>
        )}
        <Scripts />
      </body>
    </html>
  )
}
