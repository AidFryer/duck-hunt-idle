/**
 * Measures the real screen height for the layout.
 *
 * iOS home-screen apps (with a see-through status bar) sometimes report a
 * window that's short by the status bar's height, and won't draw fixed
 * elements in the strip below it. When and whether that happens changes from
 * launch to launch (and after the app comes back from the background), so the
 * home-screen app always lays out as a page sized to the whole screen, which
 * iOS draws all the way to the bottom. Everywhere else the window height is right.
 */
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isIosStandalone(): boolean {
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia?.('(display-mode: standalone)').matches;
  return isIos() && standalone;
}

/** iOS Safari (not the home-screen app): its toolbar floats over the bottom of the page. */
function isIosBrowser(): boolean {
  return isIos() && !isIosStandalone();
}

export function setupViewport(): void {
  const root = document.documentElement;
  const standalone = isIosStandalone();
  root.classList.toggle('ios-browser', isIosBrowser());
  root.classList.toggle('ios-standalone', standalone);
  let lastH = -1;
  let lastTall: boolean | null = null;
  const apply = () => {
    let h = window.innerHeight;
    let tall = false;
    if (standalone) {
      const portrait = screen.orientation ? screen.orientation.type.startsWith('portrait') : window.innerHeight >= window.innerWidth;
      const screenW = portrait ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
      const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      // Full-screen app (not an iPad side-by-side window): size to the screen,
      // whatever height iOS reports right now. Never switching back and forth
      // keeps the bottom from flickering.
      if (Math.abs(window.innerWidth - screenW) <= 2 && screenH >= h) {
        h = screenH;
        tall = true;
      }
    }
    if (tall !== lastTall) {
      lastTall = tall;
      root.classList.toggle('tall-fix', tall);
    }
    if (h !== lastH) {
      lastH = h;
      root.style.setProperty('--app-h', `${h}px`);
    }
    if (window.scrollY) window.scrollTo(0, 0);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
  // Coming back from the background can leave the page nudged; settle it.
  window.addEventListener('pageshow', apply);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(apply, 50);
  });
  // The page itself never scrolls; only the menus inside it do.
  window.addEventListener('scroll', () => {
    if (window.scrollY) window.scrollTo(0, 0);
  });
}
