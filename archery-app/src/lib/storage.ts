/**
 * Thin wrapper around localStorage so native platforms (Capacitor Preferences)
 * can swap the implementation without touching call sites.
 */
export const storage = {
  get(key: string): string | null {
    return window.localStorage.getItem(key);
  },
  set(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  },
  remove(key: string): void {
    window.localStorage.removeItem(key);
  },
};
