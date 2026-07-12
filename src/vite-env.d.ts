/// <reference types="vite/client" />

interface UmamiTracker {
  track: (eventName?: string, data?: Record<string, string | number | boolean>) => void;
  identify: (userIdOrData: string | Record<string, unknown>, data?: Record<string, unknown>) => void;
}

interface Window {
  umami?: UmamiTracker;
  webkitAudioContext?: typeof AudioContext;
}
