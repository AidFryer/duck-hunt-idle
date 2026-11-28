import { FEATURES, type FeatureId } from '../../data/features';
import { KEEPER_NAME } from '../../data/goals';

/** What a tab is for, opened from the ? in its header. On the Lodge tab, Ray says what to do next. */
export function TabHelp({ feature, ray }: { feature: FeatureId | null; ray?: string }) {
  const points = feature ? FEATURES[feature].intro.points : [];
  return (
    <section class="tab-help" aria-label="About this tab">
      {ray && (
        <div class="keeper keeper--small">
          <div class="keeper__portrait" aria-hidden="true">
            <span class="keeper__hat" />
            <span class="keeper__face" />
            <span class="keeper__beard" />
          </div>
          <div class="speech">
            <p class="speech__name">{KEEPER_NAME}, old lodge keeper</p>
            <p>{ray}</p>
          </div>
        </div>
      )}
      {points.length > 0 && (
        <ul>
          {points.map((p) => <li>{p}</li>)}
        </ul>
      )}
    </section>
  );
}
