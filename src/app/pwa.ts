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
    .then(({ registerSW }) => registerSW({ immediate: true }))
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
