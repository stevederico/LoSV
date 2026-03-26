/**
 * Advanced Umami analytics for vanilla JS apps
 *
 * Sets up passive tracking for time on page, exit intent,
 * section visibility, page load performance, JS errors, and text copy events.
 * All tracking is disabled on localhost via isLocal() guard.
 */
import { trackEvent, trackPageView } from './analytics.js';

/** @returns {boolean} True if running on localhost */
const isLocal = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** Tracked state */
const state = {
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
 * @param {EventTarget} target
 * @param {string} event
 * @param {Function} handler
 * @param {Object} [options]
 */
function addTrackedListener(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  state.cleanups.push(() => target.removeEventListener(event, handler, options));
}

/** Observe elements with data-section-id */
function observeSections() {
  if (state.observer) state.observer.disconnect();

  const seen = new Set();
  state.observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = entry.target.dataset.sectionId;
      if (entry.isIntersecting && !seen.has(id)) {
        seen.add(id);
        trackEvent('section-viewed', { section: id });
        state.observer?.unobserve(entry.target);
      }
    }
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-section-id]').forEach((el) => {
    state.observer.observe(el);
  });
}

/**
 * Initialize all passive analytics trackers.
 * Call once at app startup. Returns a cleanup function.
 * @returns {Function} Cleanup function to remove all listeners
 */
export function initAdvancedAnalytics() {
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
  const handleMouseout = (e) => {
    if (!e.relatedTarget && !state.exitFired && e.clientY < 10) {
      state.exitFired = true;
      trackEvent('exit-intent');
    }
  };
  addTrackedListener(document, 'mouseout', handleMouseout);

  // Page load performance (once)
  const perf = performance.getEntriesByType('navigation')[0];
  if (perf) {
    const loadTime = Math.round(perf.loadEventEnd - perf.startTime);
    const speed = loadTime < 1000 ? 'fast' : loadTime < 3000 ? 'medium' : 'slow';
    trackEvent('page-load', { ms: loadTime, speed });
  }

  // JS error tracking (max 5 per session)
  const handleError = (e) => {
    if (state.errorCount >= 5) return;
    state.errorCount++;
    trackEvent('js-error', { message: (e.message || 'unknown').substring(0, 50) });
  };
  addTrackedListener(window, 'error', handleError);

  // Text copy
  const handleCopy = () => {
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
