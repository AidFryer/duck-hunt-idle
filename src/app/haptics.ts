/**
 * A light tap of the phone's vibration motor for big moments.
 * Android uses navigator.vibrate. iOS Safari has no vibrate API, but tapping
 * a hidden switch-style checkbox gives a system haptic tick (iOS 18+).
 * Everything fails quietly where unsupported.
 */
let enabled = true;
let last = 0;
let iosSwitch: HTMLLabelElement | null = null;

export function setHaptics(on: boolean): void {
  enabled = on;
}

function iosTick(): void {
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-100px;top:-100px;opacity:0;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

/** 'tap' for a shot, 'big' for golden flocks and lodge builds. */
export function buzz(kind: 'tap' | 'big' = 'tap'): void {
  if (!enabled) return;
  const now = performance.now();
  if (now - last < 60) return;
  last = now;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'big' ? [18, 40, 28] : 10);
      return;
    }
    iosTick();
    if (kind === 'big') setTimeout(iosTick, 90);
  } catch {
    /* no haptics here */
  }
}
