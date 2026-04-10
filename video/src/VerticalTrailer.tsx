import type {ComponentType} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {sceneTimings} from './data/trailerData';
import type {SceneTiming} from './data/types';
import {TrailerConfigProvider, type TrailerEffects} from './lib/trailer-config';
import {TrailerAudio} from './TrailerAudio';
import {PortraitAnalyticsScene} from './scenes/portrait/PortraitAnalyticsScene';
import {PortraitColdOpenScene} from './scenes/portrait/PortraitColdOpenScene';
import {PortraitDashboardScene} from './scenes/portrait/PortraitDashboardScene';
import {PortraitMetricsScene} from './scenes/portrait/PortraitMetricsScene';
import {PortraitMontageScene} from './scenes/portrait/PortraitMontageScene';
import {PortraitSearchAiScene} from './scenes/portrait/PortraitSearchAiScene';
import {PortraitTimeTrackingScene} from './scenes/portrait/PortraitTimeTrackingScene';
import {EndCardScene} from './scenes/EndCardScene';

interface VerticalTrailerProps {
  effects?: TrailerEffects;
  includeAudio?: boolean;
}

export const VerticalTrailer = ({effects = 'full', includeAudio = true}: VerticalTrailerProps) => {
  const sceneMap: Record<SceneTiming['id'], ComponentType> = {
    'cold-open': PortraitColdOpenScene,
    'dashboard-flyby': PortraitDashboardScene,
    'metric-activation': PortraitMetricsScene,
    'time-tracking': PortraitTimeTrackingScene,
    analytics: PortraitAnalyticsScene,
    'search-ai': PortraitSearchAiScene,
    montage: PortraitMontageScene,
    'end-card': EndCardScene
  };

  return (
    <TrailerConfigProvider layout="portrait" effects={effects}>
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
