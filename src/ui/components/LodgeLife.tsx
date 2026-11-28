import { UPGRADES, type UpgradeId } from '../../data/upgrades';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import type { IconName } from '../tabs';
import { gainText, pulse } from './BotsTab';
import { BuyButton, Finished, Row, RowNote } from './Kit';
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
    <section id="lodge-guests" class="lodge-section jump-target" aria-label="Guest hunting parties">
      <h4 class="group-head">Guest hunting parties</h4>
      <p class="card__hint">
        {g.served} parties served · guestbook +{Math.round(g.bookBonus * 100)}% coins. {g.toNextLine} more for the next line.
      </p>
      {g.board.length === 0 && <p class="card__hint">No bookings right now. A new guest calls each morning.</p>}
      <ul class="up-list">
        {g.board.map((r) => (
          <Row
            cls={r.ready ? 'is-ready' : ''}
            title={r.who[0]!.toUpperCase() + r.who.slice(1)}
            sub={`${r.text} · ${formatNumber(r.progress, notation)}/${formatNumber(r.target, notation)}${r.ready ? '' : ` · leaves in ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'}`}`}
            extra={!r.ready && <span class="guest__bar"><span style={{ width: `${Math.round((r.progress / r.target) * 100)}%` }} /></span>}
            right={
              r.ready ? (
                <button class="btn btn--primary btn--buy buy-btn" aria-label="Send them home happy" onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.claimGuest(r.id))}>
                  <span class="cost">
                    <span class="cost__item">+<Icon name="coin" size={14} /> {formatNumber(r.coins, notation)}</span>
                    <span class="cost__item">+<Icon name="feather" size={14} /> {formatNumber(r.feathers, notation)}</span>
                  </span>
                </button>
              ) : (
                <RowNote>
                  <Icon name="coin" size={12} /> {formatNumber(r.coins, notation)}
                </RowNote>
              )
            }
          />
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
  const ready = open.filter((u) => u.level < u.max);
  const done = open.filter((u) => u.level >= u.max);
  const row = (u: (typeof rooms)[number]) => {
    const d = UPGRADES[u.id];
    const maxed = u.level >= u.max;
    return (
      <Row
        cls={maxed ? 'is-maxed' : ''}
        hint={d.blurb}
        pic={<Icon name={ROOM_ICON[u.id] ?? 'lodge'} size={20} />}
        title={d.name}
        tag={u.level > 0 ? `${u.level}/${u.max}` : 'new'}
        sub={`${d.effect}${u.id === 'guestDock' && !maxed ? ` (coins +${Math.round((hud.reputation - 1) * 100)}% → +${Math.round((hud.reputationNextDock - 1) * 100)}%)` : ''}${u.gain >= 0.05 && !maxed ? ` · ${gainText(u.gain, notation)}` : ''}`}
        right={maxed ? <RowNote done>Max</RowNote> : <BuyButton price={u.price} notation={notation} affordable={u.affordable} onBuy={() => controls.buyUpgrade(u.id)} />}
      />
    );
  };
  return (
    <section id="lodge-rooms" class="lodge-section jump-target" aria-label="Lodge rooms">
      <h4 class="group-head">Rooms</h4>
      <ul class="up-list">
        {ready.map(row)}
        {soon.map((u) => (
          <Row cls="is-locked" pic={<Icon name="lock" size={16} />} title={UPGRADES[u.id].name} sub={`${UPGRADES[u.id].effect} · comes with the ${u.lodgeName}`} />
        ))}
      </ul>
      <Finished count={done.length}>{done.map(row)}</Finished>
    </section>
  );
}
