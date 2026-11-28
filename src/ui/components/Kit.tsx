/**
 * Shared building blocks so every tab looks and reads the same:
 * one row style, one price button, jump chips and a "Finished" fold.
 */
import type { ComponentChildren } from 'preact';
import type { Price } from '../../sim/economy';
import type { Notation } from '../../util/format';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { Icon } from './Icon';
import type { IconName } from '../tabs';

/** A buy button that shows only the price (the row says what it buys). */
export function BuyButton({ price, notation, affordable, onBuy, label }: { price: Price; notation: Notation; affordable: boolean; onBuy: () => boolean; label?: string }) {
  return (
    <button
      class="btn btn--primary btn--buy buy-btn"
      aria-disabled={!affordable}
      aria-label={label}
      onClick={(e) => pulse(e.currentTarget as HTMLElement, onBuy())}
    >
      <Cost price={price} notation={notation} />
    </button>
  );
}

/** The same button, paid in Flyway Stars. */
export function StarButton({ cost, affordable, onBuy, label }: { cost: number; affordable: boolean; onBuy: () => boolean; label?: string }) {
  return (
    <button class="btn btn--primary btn--buy buy-btn" aria-disabled={!affordable} aria-label={label} onClick={(e) => pulse(e.currentTarget as HTMLElement, onBuy())}>
      <span class="cost"><span class="cost__item">★ {cost}</span></span>
    </button>
  );
}

/** Small right-hand note for rows with nothing to buy ("Max", "Owned", "Needs ..."). */
export function RowNote({ children, done = false }: { children: ComponentChildren; done?: boolean }) {
  return <span class={`row-note ${done ? 'is-done' : ''}`}>{children}</span>;
}

/** One compact row: optional picture, a title with a small tag, a line of detail, and something on the right. */
export function Row({ pic, title, tag, sub, right, extra, cls = '', hint }: {
  pic?: ComponentChildren;
  title: ComponentChildren;
  tag?: ComponentChildren;
  sub?: ComponentChildren;
  right?: ComponentChildren;
  /** Anything under the text (a bar, chips...). */
  extra?: ComponentChildren;
  cls?: string;
  hint?: string;
}) {
  return (
    <li class={`up-row ${cls}`} title={hint}>
      {pic && <span class="up-row__pic" aria-hidden="true">{pic}</span>}
      <div class="up-row__text">
        <strong>
          {title}
          {tag !== undefined && tag !== null && tag !== '' && <span class="up-row__lvl"> {tag}</span>}
        </strong>
        {sub && <span>{sub}</span>}
        {extra}
      </div>
      {right}
    </li>
  );
}

/** Chips at the top of a long tab that scroll to each section. */
export function JumpChips({ items, prefix }: { items: { key: string; label: string }[]; prefix: string }) {
  if (items.length < 2) return null;
  return (
    <nav class="ws-jump" aria-label="Sections">
      {items.map((it) => (
        <button class="ws-jump__chip" onClick={() => document.getElementById(`${prefix}-${it.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          {it.label}
        </button>
      ))}
    </nav>
  );
}

/** Things that are done (maxed, owned, learned), folded into one line you can open. */
export function Finished({ count, label = 'Finished', children }: { count: number; label?: string; children: ComponentChildren }) {
  if (count === 0) return null;
  return (
    <details class="finished">
      <summary>
        {label} · {count}
      </summary>
      <ul class="up-list">{children}</ul>
    </details>
  );
}

/** A section title with a small tinted icon (each ground has its own color). */
export function SectionHead({ icon, title, tone = 'wood', note }: { icon: IconName; title: ComponentChildren; tone?: Tone; note?: ComponentChildren }) {
  return (
    <>
      <h4 class="sec-head">
        <span class={`sec-head__icon tone-${tone}`} aria-hidden="true"><Icon name={icon} size={15} /></span>
        {title}
      </h4>
      {note && <p class="sec-note">{note}</p>}
    </>
  );
}
export type Tone = 'wood' | 'marsh' | 'timber' | 'field' | 'bay' | 'gold' | 'rust';

/** Level shown as little dots (or a thin bar when there are many levels). */
export function Pips({ level, max }: { level: number; max: number }) {
  if (max > 10) {
    return <span class="pips pips--bar" aria-label={`Level ${level} of ${max}`}><span style={{ width: `${Math.round((level / max) * 100)}%` }} /></span>;
  }
  return (
    <span class="pips" aria-label={`Level ${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => <i class={i < level ? 'is-on' : ''} />)}
    </span>
  );
}

export type StepState = 'done' | 'ready' | 'next' | 'later';

/** A path of steps joined by a line (skills, perks): done ones shrink to one line. */
export function Path({ children }: { children: ComponentChildren }) {
  return <ol class="path">{children}</ol>;
}
export function PathStep({ state, title, tag, sub, right }: { state: StepState; title: ComponentChildren; tag?: ComponentChildren; sub?: ComponentChildren; right?: ComponentChildren }) {
  const short = state === 'done' || state === 'later';
  return (
    <li class={`path-step path-step--${state}`}>
      <span class="path-step__dot" aria-hidden="true">{state === 'done' ? '✓' : ''}</span>
      <div class="path-step__text">
        <strong>
          {title}
          {tag !== undefined && tag !== '' && <span class="up-row__lvl"> {tag}</span>}
        </strong>
        {!short && sub && <span>{sub}</span>}
      </div>
      {right}
    </li>
  );
}
