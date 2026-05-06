/**
 * Platform detection helpers.
 * When Capacitor is added, swap these to use Capacitor.getPlatform().
 */
export function isNative(): boolean {
  return false;
}

export function getPlatform(): 'web' | 'ios' | 'android' {
  return 'web';
}
