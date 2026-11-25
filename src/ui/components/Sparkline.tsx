/** Tiny 60-second chart: completed actions as an area, problems as rust ticks. */
export function Sparkline({ done, fails }: { done: number[]; fails: number[] }) {
  const n = done.length;
  const max = Math.max(1, ...done);
  const pts = done.map((v, i) => `${(i / (n - 1)) * 100},${20 - (v / max) * 17}`).join(' ');
  return (
    <svg class="spark" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,21 ${pts} 100,21`} class="spark__area" />
      <polyline points={pts} class="spark__line" />
      {fails.map((v, i) => (v > 0 ? <rect x={(i / (n - 1)) * 100 - 0.8} y={14} width={1.6} height={7} class="spark__fail" /> : null))}
    </svg>
  );
}
