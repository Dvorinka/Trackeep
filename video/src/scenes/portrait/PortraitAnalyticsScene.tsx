import {useCurrentFrame} from 'remotion';
import {AppChrome} from '../../components/AppChrome';
import {MetricTile} from '../../components/MetricTile';
import {ProgressModule} from '../../components/ProgressModule';
import {analyticsHeadline, analyticsSummary, habitBeat, learningBeat} from '../../data/trailerData';
import {formatAnalyticsHours, formatMetricValue} from '../../lib/format';
import {easedProgress} from '../../lib/motion';
import {PortraitSceneShell} from './PortraitSceneShell';

export const PortraitAnalyticsScene = () => {
  const frame = useCurrentFrame();

  return (
    <PortraitSceneShell frame={frame} beat={analyticsHeadline}>
      <div style={{position: 'absolute', left: 90, top: 470}}>
        <AppChrome frame={frame} activeNav="Stats" sidebarItems={[]} showSidebar={false} width={900} height={980}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18, marginBottom: 18}}>
            {analyticsSummary.map((metric, index) => {
              const progress = easedProgress(frame, 16 + index * 7, 56);
              const value = metric.label === 'Hours Tracked'
                ? formatAnalyticsHours(metric.target * progress)
                : formatMetricValue(metric, metric.target * progress);

              return <MetricTile key={metric.label} frame={frame} delay={12 + index * 5} label={metric.label} value={value} icon={metric.icon} compact />;
            })}
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <ProgressModule frame={frame} delay={54} beat={learningBeat} />
            <ProgressModule frame={frame} delay={66} beat={habitBeat} />
          </div>
        </AppChrome>
      </div>
    </PortraitSceneShell>
  );
};
