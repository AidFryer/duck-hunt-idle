import { useState } from 'preact/hooks';
import type { GroundId } from '../../data/economy';
import type { HudSnapshot } from '../hudState';

/** The pill in the corner of the scene that moves you between hunting grounds. */
export function GroundPicker({ hud, ground, onPick }: { hud: HudSnapshot; ground: GroundId; onPick: (g: GroundId) => void }) {
  const [open, setOpen] = useState(false);
  const openCount = hud.grounds.filter((g) => g.open).length;
  if (openCount < 2) return null;
  const here = hud.grounds.find((g) => g.id === ground) ?? hud.grounds[0]!;
  return (
    <div class="ground-pick">
      <button class="ground-switch" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true">
        {here.name} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div class="ground-menu" role="menu">
          {hud.grounds.map((g) =>
            g.open ? (
              <button
                role="menuitem"
                class={`ground-menu__item ${g.id === ground ? 'is-here' : ''}`}
                onClick={() => {
                  setOpen(false);
                  onPick(g.id);
                }}
              >
                <strong>{g.name}</strong>
                {g.id === ground && <span>You're here</span>}
              </button>
            ) : (
              <div class="ground-menu__item is-locked">
                <strong>{g.name}</strong>
                <span>Opens with the {g.lodgeName}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
