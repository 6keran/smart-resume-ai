// Keep eligibility identical for the loader and the persistent conversation component.
export function isAssistantExcludedRoute(pathname: string | null) {
  return Boolean(pathname?.startsWith('/login') || pathname?.startsWith('/register') ||
    pathname?.startsWith('/forgot-password') || pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/admin') || pathname?.startsWith('/skills/assess') ||
    pathname?.startsWith('/skills/certificate') || pathname?.startsWith('/assessment') ||
    pathname?.startsWith('/assessments') || pathname === '/privacy' || pathname === '/terms');
}
