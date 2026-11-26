import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { NODE_NAMES, SPECIALS, type NodeKind, type SpecialNode } from '../../data/workflows';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { Icon } from './Icon';
import { pulse } from './BotsTab';

const cardName = (k: NodeKind) => (k in SPECIALS ? SPECIALS[k as SpecialNode].name : NODE_NAMES[k as keyof typeof NODE_NAMES]);
const isSpecial = (k: NodeKind) => k in SPECIALS;

interface Pos {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Chain editor: cards on a board, tied together with rope.
 * Tap a card to pick it up, then tap another card to tie a rope to it.
 */
export function WorkflowEditor({ hud, controls }: { hud: HudSnapshot; controls: GameControls }) {
  const wf = hud.workflow;
  const [sel, setSel] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<number, Pos>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Measure card centers so the ropes can be drawn between them.
  const measure = () => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const next: Record<number, Pos> = {};
    board.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => {
      const r = el.getBoundingClientRect();
      next[Number(el.dataset.node)] = { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
    });
    setPos(next);
    setSize({ w: b.width, h: b.height });
  };
  const layoutKey = wf.nodes.map((n) => n.id).join(',');
  useLayoutEffect(measure, [layoutKey]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    return () => ro.disconnect();
  }, []);

  if (!wf.unlocked) {
    return (
      <div class="tab-body">
        <div class="coming-soon">
          <div class="coming-soon__icon"><Icon name="rope" size={40} /></div>
          <h3>Workflows</h3>
          <p>A coil of rope for tying jobs into chains. Earn {wf.unlockCoins.toLocaleString()} coins and Gus will show you how.</p>
        </div>
      </div>
    );
  }

  const tap = (id: number, el: HTMLElement) => {
    if (sel === null) setSel(id);
    else if (sel === id) setSel(null);
    else {
      pulse(el, controls.connectCards(sel, id));
      setSel(null);
    }
  };

  const selectedNode = wf.nodes.find((n) => n.id === sel);
  const hasRopeOut = sel !== null && wf.links.some((l) => l.from === sel);

  return (
    <div class="tab-body workflow-tab">
      <div class={`wf-status ${wf.complete ? 'is-complete' : ''}`}>
        <div>
          <strong>{wf.complete ? 'Chain complete!' : wf.goodLinks > 0 ? `${wf.goodLinks} link${wf.goodLinks > 1 ? 's' : ''} in order` : 'No chain yet'}</strong>
          <span>
            {wf.effects.length > 0 ? wf.effects.join(' · ') : 'Tie Scout → Call → Shoot → Retrieve → Log together, in order, for a big speed bonus.'}
          </span>
        </div>
        <span class="wf-status__bonus">+{Math.round(wf.bonus * 100)}%</span>
      </div>

      <p class="card__hint board-hint">
        {sel === null
          ? 'Tap a card to pick it up, then tap the card that should come next to tie a rope. Special cards only work right after the job they help.'
          : `Now tap the card that comes after ${cardName(selectedNode!.kind)}.`}
      </p>

      <div class="wf-board" ref={boardRef} onClick={(e) => e.target === e.currentTarget && setSel(null)}>
        <svg class="wf-ropes" width={size.w} height={size.h} aria-hidden="true">
          {wf.links.map((l) => {
            const a = pos[l.from];
            const b = pos[l.to];
            if (!a || !b) return null;
            const x1 = a.x + a.w / 2;
            const y1 = a.y + a.h / 2;
            const x2 = b.x + b.w / 2;
            const y2 = b.y + b.h / 2;
            const sag = Math.min(40, Math.hypot(x2 - x1, y2 - y1) * 0.25);
            const d = `M${x1},${y1} C${x1},${y1 + sag} ${x2},${y2 + sag} ${x2},${y2}`;
            return (
              <g class={`rope rope--${l.state}`}>
                <path d={d} class="rope__body" />
                <path d={d} class="rope__twist" />
                <circle cx={x2} cy={y2 - b.h / 2 + 4} r="5" class="rope__knot" />
              </g>
            );
          })}
        </svg>
        {wf.nodes.length === 0 && <p class="wf-empty">Add cards from the box below to start a chain.</p>}
        {wf.nodes.map((n) => (
          <button
            data-node={n.id}
            class={`wf-card ${isSpecial(n.kind) ? 'wf-card--special' : ''} ${n.active ? 'is-active' : ''} ${sel === n.id ? 'is-selected' : ''}`}
            onClick={(e) => tap(n.id, e.currentTarget as HTMLElement)}
            aria-pressed={sel === n.id}
          >
            <span class="pin" />
            <strong>{cardName(n.kind)}</strong>
            <span class="wf-card__note">
              {isSpecial(n.kind) ? (n.active ? 'Working' : `Needs to follow ${SPECIALS[n.kind as SpecialNode].after.map((k) => NODE_NAMES[k]).join(' or ') || 'a job'}`) : n.active ? 'In the chain' : 'Not linked'}
            </span>
          </button>
        ))}
      </div>

      {selectedNode && (
        <div class="btn-row wf-actions">
          {hasRopeOut && (
            <button class="btn btn--small" onClick={() => { controls.cutRope(selectedNode.id); setSel(null); }}>
              Cut its rope
            </button>
          )}
          <button class="btn btn--small btn--danger" onClick={() => { controls.removeCard(selectedNode.id); setSel(null); }}>
            Take card off the board
          </button>
          <button class="btn btn--small" onClick={() => setSel(null)}>Done</button>
        </div>
      )}

      <section class="card">
        <h3>Card box</h3>
        <div class="wf-palette">
          {wf.palette.map((p) => (
            <button
              class={`wf-chip ${isSpecial(p.kind) ? 'wf-chip--special' : ''}`}
              aria-disabled={!p.unlocked || p.placed}
              title={!p.unlocked ? p.hint : p.placed ? 'Already on the board' : isSpecial(p.kind) ? SPECIALS[p.kind as SpecialNode].desc : 'Add to the board'}
              onClick={(e) => p.unlocked && !p.placed && pulse(e.currentTarget as HTMLElement, controls.addCard(p.kind))}
            >
              <strong>{cardName(p.kind)}</strong>
              <span>{!p.unlocked ? p.hint : p.placed ? 'On the board' : isSpecial(p.kind) ? SPECIALS[p.kind as SpecialNode].desc : 'Job card'}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
