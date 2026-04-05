function normalizePlatform(p: string): string {
  if (p === 'darwin' || p.startsWith('mac')) return 'darwin';
  if (p === 'win32' || p.startsWith('win')) return 'win32';
  if (p.includes('linux')) return 'linux';
  return p;
}

const platform = normalizePlatform(
  window.electronAPI.platform ?? navigator.platform?.toLowerCase() ?? ''
);

export const isMac = platform === 'darwin';
export const isWindows = platform === 'win32';
export const isLinux = platform === 'linux';

export function getModifierSymbol(
  modifier: 'commandorcontrol' | 'ctrl' | 'control' | 'cmd' | 'command' | 'meta' | 'alt' | 'option' | 'shift'
): string {
  const normalized = modifier.toLowerCase();

  if (
    normalized === 'commandorcontrol' ||
    normalized === 'cmd' ||
    normalized === 'command' ||
    normalized === 'meta' ||
    normalized === 'ctrl' ||
    normalized === 'control'
  ) {
    return isMac ? '⌘' : 'Ctrl';
  }

  if (normalized === 'alt' || normalized === 'option') {
    return isMac ? '⌥' : 'Alt';
  }

  if (normalized === 'shift') {
    return isMac ? '⇧' : 'Shift';
  }

  return modifier;
}

export function getPlatformShortcut(keys: string[]): string[] {
  return keys.map((key) => {
    const normalized = key.toLowerCase();

    if (normalized === '⌘' || normalized === 'command' || normalized === 'meta' || normalized === 'cmd') {
      return isMac ? '⌘' : 'Ctrl';
    }

    if (normalized === '⌃' || normalized === 'control' || normalized === 'ctrl') {
      return isMac ? '⌃' : 'Ctrl';
    }

    if (normalized === '⌥' || normalized === 'option' || normalized === 'alt') {
      return isMac ? '⌥' : 'Alt';
    }

    if (normalized === '⇧' || normalized === 'shift') {
      return isMac ? '⇧' : 'Shift';
    }

    return key;
  });
}
