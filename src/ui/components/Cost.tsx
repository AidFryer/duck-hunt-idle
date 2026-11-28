import type { Price } from '../../sim/economy';
import { formatNumber, type Notation } from '../../util/format';
import { Icon } from './Icon';

export function Cost({ price, notation }: { price: Price; notation: Notation }) {
  return (
    <span class="cost">
      {(price.coins.gt(0) || price.feathers.lte(0)) && (
        <span class="cost__item">
          <Icon name="coin" size={14} /> {formatNumber(price.coins, notation)}
        </span>
      )}
      {price.feathers.gt(0) && (
        <span class="cost__item">
          <Icon name="feather" size={14} /> {formatNumber(price.feathers, notation)}
        </span>
      )}
    </span>
  );
}
