import {useCurrentFrame} from 'remotion';
import {AppChrome} from '../../components/AppChrome';
import {ChartBars} from '../../components/ChartBars';
import {MetricTile} from '../../components/MetricTile';
import {ProgressModule} from '../../components/ProgressModule';
import {activationHeadline, activationMetrics, storageBeat, weeklyActivity} from '../../data/trailerData';
import {formatMetricValue} from '../../lib/format';
import {easedProgress} from '../../lib/motion';
import {PortraitSceneShell} from './PortraitSceneShell';

export const PortraitMetricsScene = () => {
  const frame = useCurrentFrame();

  return (
    <PortraitSceneShell frame={frame} beat={activationHeadline}>
      <div style={{position: 'absolute', left: 90, top: 446}}>
        <AppChrome
          frame={frame}
          activeNav="Home"
          sidebarItems={[]}
          showSidebar={false}
          width={900}
          height={1120}
          contentStyle={{padding: '24px 24px 26px'}}
        >
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 16}}>
            {activationMetrics.slice(0, 6).map((metric, index) => {
              const progress = easedProgress(frame, 16 + index * 5, 42);
              return (
                <MetricTile
                  key={metric.label}
                  frame={frame}
                  delay={10 + index * 4}
                  label={metric.label}
                  value={formatMetricValue(metric, metric.target * progress)}
                  icon={metric.icon}
                  compact
                />
              );
            })}
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <ChartBars frame={frame} delay={54} values={weeklyActivity} />
            <ProgressModule frame={frame} delay={62} beat={storageBeat} />
          </div>
        </AppChrome>
      </div>
    </PortraitSceneShell>
  );
};
