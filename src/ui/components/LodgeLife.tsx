import { UPGRADES, type UpgradeId } from '../../data/upgrades';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import type { IconName } from '../tabs';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { Icon } from './Icon';

const ROOM_ICON: Partial<Record<UpgradeId, IconName>> = {
  lodgeRooms: 'bed', coffee: 'mug', cot: 'moon', boatHouse: 'boat', lanterns: 'lamp', guestDock: 'drop',
  smokehouse: 'cloud', carvingShed: 'hammer', trophyRoom: 'trophy', mapRoom: 'map',
};

/** Guest hunting parties: bookings to fill for a payout and a line in the guestbook. */
export function GuestBoard({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const g = hud.guests;
  if (!g.open) {
    return (
      <section class="lodge-section is-locked">
        <h4 class="group-head">Guest hunting parties</h4>
        <p class="card__hint">Once the Marsh Lodge is built, guests start booking hunts with requests. Fill them for big payouts.</p>
      </section>
    );
  }
  return (
    <section class="lodge-section" aria-label="Guest hunting parties">
      <h4 class="group-head">Guest hunting parties</h4>
      <p class="card__hint">
        {g.served} parties served · guestbook +{Math.round(g.bookBonus * 100)}% coins. {g.toNextLine} more for the next line.
      </p>
      {g.board.length === 0 && <p class="card__hint">No bookings right now. A new guest calls each morning.</p>}
      <ul class="guest-list">
        {g.board.map((r) => (
          <li class={`guest ${r.ready ? 'is-ready' : ''}`}>
            <div class="guest__text">
              <strong>{r.who[0]!.toUpperCase() + r.who.slice(1)}</strong>
              <span>{r.text}</span>
              <span class="guest__bar"><span style={{ width: `${Math.round((r.progress / r.target) * 100)}%` }} /></span>
              <span class="guest__meta">
                {formatNumber(r.progress, notation)}/{formatNumber(r.target, notation)}
                {!r.ready && ` · leaves in ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'}`}
              </span>
            </div>
            {r.ready ? (
              <button class="btn btn--primary btn--buy btn--small" onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.claimGuest(r.id))}>
                <span>Send them home happy</span>
                <span class="cost">
                  <span class="cost__item"><Icon name="coin" size={14} /> {formatNumber(r.coins, notation)}</span>
                  <span class="cost__item"><Icon name="feather" size={14} /> {formatNumber(r.feathers, notation)}</span>
                </span>
              </button>
            ) : (
              <span class="guest__pay">
                <Icon name="coin" size={13} /> {formatNumber(r.coins, notation)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Rooms of the lodge: build each one out for a lasting bonus. */
export function LodgeRooms({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const rooms = hud.upgrades.filter((u) => UPGRADES[u.id].room);
  const open = rooms.filter((u) => u.revealed).sort((a, b) => a.lodge - b.lodge || a.price.coins.cmp(b.price.coins));
  const soon = rooms.filter((u) => !u.revealed);
  if (open.length === 0 && soon.length === 0) return null;
  return (
    <section class="lodge-section" aria-label="Lodge rooms">
      <h4 class="group-head">Rooms</h4>
      <div class="room-grid">
        {open.map((u) => {
          const d = UPGRADES[u.id];
          const maxed = u.level >= u.max;
          return (
            <div class={`room ${u.level > 0 ? 'is-built' : ''} ${maxed ? 'is-maxed' : ''}`} title={d.blurb}>
              <span class="room__icon"><Icon name={ROOM_ICON[u.id] ?? 'lodge'} size={22} /></span>
              <strong>{d.name}</strong>
              <span class="room__lvl">{u.level > 0 ? `Level ${u.level}/${u.max}` : 'Not built'}</span>
              <span class="room__effect">{d.effect}</span>
              {maxed ? (
                <span class="maxed">Finished</span>
              ) : (
                <button class="btn btn--primary btn--buy btn--small" aria-disabled={!u.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyUpgrade(u.id))}>
                  <span>{u.level > 0 ? 'Improve' : 'Build'}</span>
                  <Cost price={u.price} notation={notation} />
                </button>
              )}
            </div>
          );
        })}
        {soon.map((u) => (
          <div class="room is-locked">
            <span class="room__icon"><Icon name="lock" size={18} /></span>
            <strong>{UPGRADES[u.id].name}</strong>
            <span class="room__effect">Comes with the {u.lodgeName}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
