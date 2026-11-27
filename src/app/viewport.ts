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
  root.classList.toggle('ios-browser', isIosBrowser());
  root.classList.toggle('ios-standalone', isIosStandalone());
  const apply = () => {
    let h = window.innerHeight;
    let tall = false;
    if (isIosStandalone()) {
      // With the see-through status bar, iOS reports a window that's short by
      // the status bar's height and won't draw fixed elements below it. When
      // that happens the game lays out as a normal page sized to the screen,
      // which iOS does draw all the way to the bottom.
      const portrait = window.innerHeight >= window.innerWidth;
      const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      if (screenH - window.innerHeight > 8) {
        h = screenH;
        tall = true;
      }
    }
    root.classList.toggle('tall-fix', tall);
    root.style.setProperty('--app-h', `${h}px`);
    if (window.scrollY) window.scrollTo(0, 0);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
  window.visualViewport?.addEventListener('resize', apply);
  // The page itself never scrolls; only the menus inside it do.
  window.addEventListener('scroll', () => {
    if (window.scrollY) window.scrollTo(0, 0);
  });
}
