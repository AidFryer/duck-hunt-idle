import gsap from 'gsap';

/**
 * DOM feedback over the scene: floating "+5" numbers and cozy toasts.
 * Kept out of Pixi so it can use the UI fonts and CSS.
 */
export type FloatKind = 'coins' | 'feathers' | 'info' | 'alert' | 'tally';
export type ToastTone = 'info' | 'good' | 'celebrate';

class Feedback {
  private floatHost: HTMLElement | null = null;
  private toastHost: HTMLElement | null = null;
  private live = 0;
  reducedMotion = false;

  attach(floatHost: HTMLElement, toastHost: HTMLElement): void {
    this.floatHost = floatHost;
    this.toastHost = toastHost;
  }

  /** Float a short label up from a point in scene coordinates (CSS px). */
  float(text: string, x: number, y: number, kind: FloatKind = 'info', delay = 0): void {
    const el = this.floatEl(kind);
    if (!el) return;
    el.textContent = text;
    this.launch(el, x, y, delay);
  }

  /** One popup for a pickup: coins and feathers side by side. */
  pickup(coins: string | null, feathers: string | null, x: number, y: number): void {
    if (!coins && !feathers) return;
    const el = this.floatEl('pickup');
    if (!el) return;
    if (coins) el.appendChild(part(`+${coins}`, COIN_SVG, 'pickup__coins'));
    if (feathers) el.appendChild(part(`+${feathers}`, FEATHER_SVG, 'pickup__feathers'));
    this.launch(el, x, y, 0);
  }

  private floatEl(kind: FloatKind | 'pickup'): HTMLElement | null {
    if (!this.floatHost || this.live > 24) return null;
    const el = document.createElement('div');
    el.className = `floater floater--${kind}`;
    return el;
  }

  private launch(el: HTMLElement, x: number, y: number, delay: number): void {
    const host = this.floatHost!;
    // Keep popups clear of the side buttons on the left and the screen edge.
    x = Math.min(Math.max(x, 110), host.clientWidth - 70);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    host.appendChild(el);
    this.live++;
    const done = () => {
      el.remove();
      this.live--;
    };
    if (this.reducedMotion) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, delay, yoyo: true, repeat: 1, repeatDelay: 0.7, onComplete: done });
      return;
    }
    gsap.fromTo(
      el,
      { y: 0, opacity: 0, scale: 0.6 },
      {
        keyframes: [
          { opacity: 1, scale: 1.1, y: -14, duration: 0.25, ease: 'back.out(3)' },
          { scale: 1, y: -46, duration: 0.9, ease: 'sine.out' },
          { opacity: 0, y: -60, duration: 0.35, ease: 'sine.in' },
        ],
        delay,
        onComplete: done,
      },
    );
  }

  /** Burst of little stars around a button (purchases, perks). */
  sparkle(el: HTMLElement): void {
    if (this.reducedMotion) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.textContent = i % 3 === 0 ? '✦' : '✧';
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      document.body.appendChild(s);
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      const d = 30 + Math.random() * 30;
      gsap.fromTo(
        s,
        { x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 },
        { x: Math.cos(a) * d, y: Math.sin(a) * d - 10, scale: 1.1, opacity: 0, rotate: 180, duration: 0.7 + Math.random() * 0.3, ease: 'power2.out', onComplete: () => s.remove() },
      );
    }
  }

  toast(text: string, tone: ToastTone = 'info', ms = 3200): void {
    const host = this.toastHost;
    if (!host) return;
    while (host.children.length >= 3) host.firstElementChild?.remove();
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;
    el.setAttribute('role', 'status');
    el.textContent = text;
    host.appendChild(el);
    gsap.fromTo(el, { y: 16, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: this.reducedMotion ? 0.01 : 0.35, ease: 'back.out(2)' });
    gsap.to(el, { opacity: 0, y: -8, duration: 0.3, delay: ms / 1000, onComplete: () => el.remove() });
  }
}

const svg = (body: string) =>
  `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const COIN_SVG = svg('<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 9.5c0-1 1-1.8 2.5-1.8s2.5.7 2.5 1.8-1.2 1.6-2.5 1.9-2.5.9-2.5 2 1 1.8 2.5 1.8 2.5-.8 2.5-1.8"/>');
const FEATHER_SVG = svg('<path d="M19.5 4.5C12 5 6.5 10 5.5 18.5c6-1 11.5-5.5 14-14z"/><path d="M4 20l9-9M9 14.5h4M11 12h4"/>');

function part(text: string, icon: string, cls: string): HTMLElement {
  const span = document.createElement('span');
  span.className = cls;
  span.innerHTML = icon;
  span.append(text);
  return span;
}

export const feedback = new Feedback();
