import Decimal from 'break_infinity.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatNumber, type Notation } from '../../util/format';

/**
 * A number that counts up smoothly toward its target and gives a little
 * bump when it increases. Very large values just snap (no visible tween).
 */
export function Counter({ value, notation }: { value: Decimal | number; notation: Notation }) {
  const target = value instanceof Decimal ? value : new Decimal(value);
  const [shown, setShown] = useState(target);
  const [bump, setBump] = useState(0);
  const raf = useRef(0);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (target.gt(from)) setBump((b) => b + 1);
    cancelAnimationFrame(raf.current);
    if (target.gte(1e15) || target.lt(from) || target.sub(from).lt(1)) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const a = from.toNumber();
    const b = target.toNumber();
    const t0 = performance.now();
    const dur = 450;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = new Decimal(a + (b - a) * e);
      shownRef.current = k >= 1 ? target : v;
      setShown(shownRef.current);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target.toString()]);

  return (
    <span class="counter" key={bump} data-bump={bump > 0 ? '1' : '0'}>
      {formatNumber(shown, notation)}
    </span>
  );
}
