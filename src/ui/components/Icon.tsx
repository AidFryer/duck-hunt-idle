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
