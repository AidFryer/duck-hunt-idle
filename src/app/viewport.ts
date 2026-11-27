/**
 * Measures the real screen height for the layout.
 *
 * iOS home-screen apps (with a translucent status bar) report a viewport
 * that is short by the status bar's height, which left an empty strip at the
 * bottom. There we use the physical screen size instead; everywhere else the
 * visible window height is right.
 */
function isIosStandalone(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia?.('(display-mode: standalone)').matches;
  return ios && standalone;
}

/** iOS Safari (not the home-screen app): its toolbar floats over the bottom of the page. */
function isIosBrowser(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !isIosStandalone();
}

export function setupViewport(): void {
  const root = document.documentElement;
  const standalone = isIosStandalone();
  root.classList.toggle('ios-browser', isIosBrowser());
  root.classList.toggle('ios-standalone', standalone);
  // Once the short window is spotted for an orientation, stay in tall mode
  // for it. (Switching the mode changes the window size iOS reports, so
  // re-checking every resize made it flip back and forth and flicker.)
  const tallFor: { portrait?: boolean; landscape?: boolean } = {};
  let lastH = -1;
  let lastTall: boolean | null = null;
  const apply = () => {
    let h = window.innerHeight;
    let tall = false;
    if (standalone) {
      const portrait = screen.orientation ? screen.orientation.type.startsWith('portrait') : window.innerHeight >= window.innerWidth;
      const key = portrait ? 'portrait' : 'landscape';
      const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      if (tallFor[key] === undefined && window.innerHeight > 0) tallFor[key] = screenH - window.innerHeight > 8;
      if (tallFor[key]) {
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
  // The page itself never scrolls; only the menus inside it do.
  window.addEventListener('scroll', () => {
    if (window.scrollY) window.scrollTo(0, 0);
  });
}
