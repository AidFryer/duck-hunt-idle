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
  document.documentElement.classList.toggle('ios-browser', isIosBrowser());
  document.documentElement.classList.toggle('ios-standalone', isIosStandalone());
  const apply = () => {
    let h = window.innerHeight;
    if (isIosStandalone()) {
      const portrait = window.innerHeight >= window.innerWidth;
      const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      h = Math.max(h, screenH, document.documentElement.clientHeight);
    }
    document.documentElement.style.setProperty('--app-h', `${h}px`);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
  window.visualViewport?.addEventListener('resize', apply);
}
