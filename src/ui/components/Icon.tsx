import type { IconName } from '../tabs';

/** Small hand-drawn-style inline SVG icons (original art, no icon fonts). */
const paths: Record<IconName, preact.JSX.Element> = {
  marsh: (
    <>
      <path d="M3 17c3-1.5 6-1.5 9 0s6 1.5 9 0" />
      <path d="M3 20.5c3-1.5 6-1.5 9 0s6 1.5 9 0" opacity=".6" />
      <path d="M7 15V7M7 7c0-1.5 1.5-1.5 1.5 0v3c0 1.5-1.5 1.5-1.5 0" />
      <path d="M16 15c0-4 1-7 3-9M13 15c0-3-1-5-3-6" />
    </>
  ),
  bot: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="4" />
      <circle cx="9.5" cy="13" r="1.4" />
      <circle cx="14.5" cy="13" r="1.4" />
      <path d="M12 8V5M10.5 4h3M8 21l1-3M16 21l-1-3" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="4.5" width="17" height="14" rx="1.5" />
      <path d="M7 9h4v4H7zM13.5 8.5h4M13.5 11.5h4M13.5 14.5h2.5M8 21l1.5-2.5M16 21l-1.5-2.5" />
    </>
  ),
  rope: (
    <>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <circle cx="7" cy="18" r="2.5" />
      <path d="M8.3 8c3 1 5 2 7.4 3M15.8 13.2C13 15 11 16.5 9.3 17" />
    </>
  ),
  hammer: (
    <>
      <path d="M13.5 6.5l4 4M5 19l8.5-8.5" />
      <path d="M11 4.5l4-1.5 5 5-1.5 4-2-2-3.5-3.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5c3-1 5.5-1 8 1 2.5-2 5-2 8-1v13c-3-1-5.5-1-8 1-2.5-2-5-2-8-1z" />
      <path d="M12 6.5v13" />
    </>
  ),
  star: <path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  bed: (
    <>
      <path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
      <circle cx="7" cy="11.5" r="1.8" />
    </>
  ),
  mug: (
    <>
      <path d="M5 9h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" />
      <path d="M16 11h2a2 2 0 0 1 0 4h-2M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3" />
    </>
  ),
  boat: (
    <>
      <path d="M3 15h18l-2.5 4.5H5.5L3 15z" />
      <path d="M12 4v11M12 5l6 8h-6" />
    </>
  ),
  lamp: (
    <>
      <path d="M12 3v3M8 6h8l-1 9H9L8 6z" />
      <path d="M10 15v3h4v-3M12 18v3" />
    </>
  ),
  map: (
    <>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  lodge: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5M16 6V3h2v4.5" />
    </>
  ),
  podium: <path d="M3 20h18M4.5 20v-6h5v6M9.5 20V9h5v11M14.5 20v-8.5h5V20M12 4.5l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
      <path d="M5 19l8-8" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v9M9.5 9.5c0-1 1-1.8 2.5-1.8s2.5.7 2.5 1.8-1.2 1.6-2.5 1.9-2.5.9-2.5 2 1 1.8 2.5 1.8 2.5-.8 2.5-1.8" />
    </>
  ),
  feather: (
    <>
      <path d="M19.5 4.5C12 5 6.5 10 5.5 18.5c6-1 11.5-5.5 14-14z" />
      <path d="M4 20l9-9M9 14.5h4M11 12h4" />
    </>
  ),
  duck: (
    <>
      <path d="M4 14c0 3 3 5 8 5s8-2 8-6c-2 1-4 1-6 0 1-1 1.5-2 1.5-3.5A3.5 3.5 0 0 0 12 6a3.5 3.5 0 0 0-3.5 3.5c0 1 .3 2 1 2.8C7 12.5 4 12 4 14z" />
      <path d="M15.5 9l3-.5" />
    </>
  ),
  wind: <path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7" />,
  fog: <path d="M4 9h12M6 12.5h14M3 16h12M7 19.5h10" />,
  drop: (
    <>
      <path d="M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10z" />
    </>
  ),
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />,
  lock: (
    <>
      <rect x="5.5" y="11" width="13" height="9.5" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  cloud: <path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
};

export function Icon({ name, size = 22, class: cls }: { name: IconName; size?: number; class?: string }) {
  return (
    <svg
      class={`icon ${cls ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
