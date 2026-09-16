'use client';

import { useEffect } from 'react';

/**
 * Vercel preview links can require a temporary share token. Some browsers also
 * aggressively filter request paths containing provider names. Keep preview
 * API traffic on a neutral endpoint and preserve the share token when present.
 * Production is unaffected because production URLs do not carry _vercel_share.
 */
export function PreviewApiBridge() {
  useEffect(() => {
    const shareToken = new URLSearchParams(window.location.search).get('_vercel_share');
    const originalFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      let url: URL | null = null;

      if (typeof input === 'string') {
        url = new URL(input, window.location.origin);
      } else if (input instanceof URL) {
        url = new URL(input.toString());
      }

      if (url && url.origin === window.location.origin && url.pathname === '/api/youtube/search') {
        url.pathname = '/api/music/search';
      }

      if (url && shareToken && url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
        url.searchParams.set('_vercel_share', shareToken);
      }

      if (url && (typeof input === 'string' || input instanceof URL)) {
        const nextInput = url.origin === window.location.origin
          ? `${url.pathname}${url.search}${url.hash}`
          : url.toString();
        return originalFetch(nextInput, init);
      }

      return originalFetch(input, init);
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
