import type {ComponentType} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {sceneTimings} from './data/trailerData';
import type {SceneTiming} from './data/types';
import {TrailerConfigProvider, type TrailerEffects} from './lib/trailer-config';
import {TrailerAudio} from './TrailerAudio';
import {AnalyticsScene} from './scenes/AnalyticsScene';
import {ColdOpenScene} from './scenes/ColdOpenScene';
import {DashboardFlybyScene} from './scenes/DashboardFlybyScene';
import {EndCardScene} from './scenes/EndCardScene';
import {MetricsActivationScene} from './scenes/MetricsActivationScene';
import {MontageScene} from './scenes/MontageScene';
import {SearchAiScene} from './scenes/SearchAiScene';
import {TimeTrackingScene} from './scenes/TimeTrackingScene';

interface TrailerProps {
  effects?: TrailerEffects;
  includeAudio?: boolean;
}

export const Trailer = ({effects = 'full', includeAudio = true}: TrailerProps) => {
  const sceneMap: Record<SceneTiming['id'], ComponentType> = {
    'cold-open': ColdOpenScene,
    'dashboard-flyby': DashboardFlybyScene,
    'metric-activation': MetricsActivationScene,
    'time-tracking': TimeTrackingScene,
    analytics: AnalyticsScene,
    'search-ai': SearchAiScene,
    montage: MontageScene,
    'end-card': EndCardScene
  } as const;

  return (
    <TrailerConfigProvider layout="landscape" effects={effects}>
      <AbsoluteFill>
        {includeAudio ? <TrailerAudio /> : null}
        {sceneTimings.map((scene) => {
          const SceneComponent = sceneMap[scene.id];
          return (
            <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration}>
              <SceneComponent />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </TrailerConfigProvider>
  );
};
