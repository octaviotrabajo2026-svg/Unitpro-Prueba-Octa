// lib/tracking.ts
// Fire-and-forget tracking helpers. Never throw, never block UI.

export function trackPageView(negocioId: number): void {
  if (typeof window === 'undefined' || !negocioId) return;

  const payload = JSON.stringify({
    negocioId,
    type: 'pageview',
    path: window.location.pathname,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
  });

  try {
    if (navigator.sendBeacon) {
      // sendBeacon needs Blob for JSON content-type
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/track', blob);
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // silently ignore
  }
}

export function trackEvent(
  negocioId: number,
  eventType: 'booking' | 'contact' | 'whatsapp_click' | 'purchase',
  metadata?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !negocioId) return;

  const payload = JSON.stringify({
    negocioId,
    type: 'event',
    event_type: eventType,
    metadata: metadata ?? {},
  });

  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // silently ignore
  }
}
