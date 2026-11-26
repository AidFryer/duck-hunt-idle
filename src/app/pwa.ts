import { Store } from '../ui/store';

/**
 * Service worker registration (offline play) and the "Install app" prompt.
 * Everything fails quietly: in previews, iframes or browsers without
 * service workers the game simply runs online.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const installState = new Store<{ canInstall: boolean; installed: boolean; ios: boolean }>({
  canInstall: false,
  installed: isStandalone(),
  ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
});

let deferred: InstallPromptEvent | null = null;

/** How often a running game looks for a new version. */
const UPDATE_CHECK_MS = 15 * 60_000;

declare const __BUILD__: string;
/** When this copy of the game was built, shown in Settings. */
export const BUILD_STAMP: string = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

const SEEN_KEY = 'duck-hunt-idle.build';
/** True once per new version, so the game can say it updated. */
export function justUpdated(): boolean {
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    localStorage.setItem(SEEN_KEY, BUILD_STAMP);
    return seen !== null && seen !== BUILD_STAMP;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function setupPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    installState.set({ ...installState.get(), canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installState.set({ ...installState.get(), canInstall: false, installed: true });
  });
  const inFrame = window.self !== window.top;
  if (!import.meta.env.PROD || inFrame || !('serviceWorker' in navigator)) return;
  import('virtual:pwa-register')
    .then(({ registerSW }) =>
      registerSW({
        immediate: true,
        // A home-screen app is usually woken up rather than reopened, so the
        // browser rarely looks for a new version by itself. Look whenever the
        // game comes back to the front, and every so often while playing.
        // A new version installs itself and the page reloads (the save is
        // written on the way out), so there's never a need to reinstall.
        onRegisteredSW(_url, reg) {
          if (!reg) return;
          const check = () => {
            if (navigator.onLine !== false) void reg.update().catch(() => undefined);
          };
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) check();
          });
          setInterval(check, UPDATE_CHECK_MS);
        },
      }),
    )
    .catch(() => {
      /* offline support unavailable here; the game still works online */
    });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  installState.set({ ...installState.get(), canInstall: false, installed: choice.outcome === 'accepted' });
  return choice.outcome === 'accepted';
}
