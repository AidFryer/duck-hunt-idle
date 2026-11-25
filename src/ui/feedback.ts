import gsap from 'gsap';

/**
 * DOM feedback over the scene: floating "+5" numbers and cozy toasts.
 * Kept out of Pixi so it can use the UI fonts and CSS.
 */
export type FloatKind = 'coins' | 'feathers' | 'info' | 'alert';
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
    const host = this.floatHost;
    if (!host || this.live > 24) return;
    const el = document.createElement('div');
    el.className = `floater floater--${kind}`;
    el.textContent = text;
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

export const feedback = new Feedback();
