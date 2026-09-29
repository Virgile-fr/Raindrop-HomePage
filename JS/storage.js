"use strict";

// Storage may be blocked (private browsing, quota, browser policy).
// Keep the current tab usable even when preferences cannot be persisted.
const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Best effort. */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* Best effort. */ }
  },
  readJSON(key, fallback) {
    try { return JSON.parse(this.get(key)) ?? fallback; } catch { return fallback; }
  },
};
