export function formatFirebaseAuthError(err: unknown, hostname?: string): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
    const cleanHost = (hostname || '').trim();
    return cleanHost
      ? `Google Sign-In is not yet authorized for "${cleanHost}" (auth/unauthorized-domain).`
      : 'Google Sign-In is not yet authorized for this domain (auth/unauthorized-domain).';
  }

  if (code === 'auth/popup-blocked' || rawMessage.includes('auth/popup-blocked')) {
    return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }

  if (code === 'auth/popup-closed-by-user' || rawMessage.includes('auth/popup-closed-by-user')) {
    return 'Sign-in window was closed before completing authentication.';
  }

  if (
    code === 'auth/cancelled-popup-request' ||
    rawMessage.includes('auth/cancelled-popup-request')
  ) {
    return 'Sign-in request was cancelled. Please try again.';
  }

  if (
    code === 'auth/network-request-failed' ||
    rawMessage.includes('auth/network-request-failed')
  ) {
    return 'Network error while contacting Google Sign-In. Please check your connection and try again.';
  }

  return rawMessage || 'Google Sign-In failed.';
}
