import { FEATURES, type FeatureId } from '../../data/features';

/** "What's this tab for?" — the stage's explanation, always available. */
export function TabHelp({ feature }: { feature: FeatureId }) {
  const f = FEATURES[feature];
  return (
    <details class="tab-help">
      <summary>What's the {f.name} tab for?</summary>
      <ul>
        {f.intro.points.map((p) => <li>{p}</li>)}
      </ul>
    </details>
  );
}
