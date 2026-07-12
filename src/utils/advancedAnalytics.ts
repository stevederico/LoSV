/**
 * Advanced Umami analytics for vanilla apps
 *
 * Sets up passive tracking for time on page, exit intent,
 * section visibility, page load performance, JS errors, and text copy events.
 * All tracking is disabled on localhost via isLocal() guard.
 */
import { trackEvent, trackPageView } from './analytics';

/** True if running on localhost */
const isLocal = (): boolean =>
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

type AnalyticsState = {
  timeStart: number;
  timeThresholds: Set<number>;
  exitFired: boolean;
  errorCount: number;
  interval: ReturnType<typeof setInterval> | null;
  observer: IntersectionObserver | null;
  cleanups: Array<() => void>;
};

/** Tracked state */
const state: AnalyticsState = {
  timeStart: Date.now(),
  timeThresholds: new Set(),
  exitFired: false,
  errorCount: 0,
  interval: null,
  observer: null,
  cleanups: []
};

/**
 * Adds an event listener and tracks it for cleanup
 */
function addTrackedListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  target.addEventListener(event, handler, options);
  state.cleanups.push(() => target.removeEventListener(event, handler, options));
}

/** Observe elements with data-section-id */
function observeSections(): void {
  if (state.observer) state.observer.disconnect();

  const seen = new Set<string>();
  state.observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const target = entry.target;
      if (!(target instanceof HTMLElement)) continue;
      const id = target.dataset.sectionId;
      if (!id) continue;
      if (entry.isIntersecting && !seen.has(id)) {
        seen.add(id);
        trackEvent('section-viewed', { section: id });
        state.observer?.unobserve(target);
      }
    }
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-section-id]').forEach((el) => {
    state.observer?.observe(el);
  });
}

/**
 * Initialize all passive analytics trackers.
 * Call once at app startup. Returns a cleanup function.
 */
export function initAdvancedAnalytics(): () => void {
  if (isLocal()) return () => {};

  // Time on page
  state.interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.timeStart) / 1000);
    for (const threshold of [30, 60, 120, 300]) {
      if (elapsed >= threshold && !state.timeThresholds.has(threshold)) {
        state.timeThresholds.add(threshold);
        trackEvent('time-on-page', { seconds: threshold });
      }
    }
  }, 5000);

  // Exit intent
  const handleMouseout = (e: Event): void => {
    if (!(e instanceof MouseEvent)) return;
    if (!e.relatedTarget && !state.exitFired && e.clientY < 10) {
      state.exitFired = true;
      trackEvent('exit-intent');
    }
  };
  addTrackedListener(document, 'mouseout', handleMouseout);

  // Page load performance (once)
  const perfEntries = performance.getEntriesByType('navigation');
  const perf = perfEntries[0];
  if (perf && perf instanceof PerformanceNavigationTiming) {
    const loadTime = Math.round(perf.loadEventEnd - perf.startTime);
    const speed = loadTime < 1000 ? 'fast' : loadTime < 3000 ? 'medium' : 'slow';
    trackEvent('page-load', { ms: loadTime, speed });
  }

  // JS error tracking (max 5 per session)
  const handleError = (e: Event): void => {
    if (state.errorCount >= 5) return;
    state.errorCount++;
    const message =
      e instanceof ErrorEvent ? (e.message || 'unknown').substring(0, 50) : 'unknown';
    trackEvent('js-error', { message });
  };
  addTrackedListener(window, 'error', handleError);

  // Text copy
  const handleCopy = (): void => {
    trackEvent('text-copied');
  };
  addTrackedListener(document, 'copy', handleCopy);

  // Initial section observation
  setTimeout(observeSections, 100);

  // Fire initial page view
  trackPageView();
  trackEvent('page-viewed');

  // Return cleanup function
  return () => {
    state.cleanups.forEach((fn) => fn());
    state.cleanups = [];
    if (state.interval) clearInterval(state.interval);
    if (state.observer) state.observer.disconnect();
  };
}
