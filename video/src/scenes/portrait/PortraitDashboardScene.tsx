import {useCurrentFrame} from 'remotion';
import {AppChrome} from '../../components/AppChrome';
import {MetricTile} from '../../components/MetricTile';
import {dashboardHeadline, dashboardHeroMetrics, dashboardSecondaryMetrics} from '../../data/trailerData';
import {PortraitSceneShell} from './PortraitSceneShell';

export const PortraitDashboardScene = () => {
  const frame = useCurrentFrame();

  return (
    <PortraitSceneShell frame={frame} beat={dashboardHeadline}>
      <div style={{position: 'absolute', left: 90, top: 470}}>
        <AppChrome frame={frame} activeNav="Home" sidebarItems={[]} showSidebar={false} width={900} height={980}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18, marginBottom: 18}}>
            {dashboardHeroMetrics.map((metric, index) => (
              <MetricTile key={metric.label} frame={frame} delay={16 + index * 5} label={metric.label} value={String(metric.target)} icon={metric.icon} compact />
            ))}
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18}}>
            {dashboardSecondaryMetrics.map((metric, index) => (
              <MetricTile
                key={metric.label}
                frame={frame}
                delay={38 + index * 5}
                label={metric.label}
                value={metric.decimals ? metric.target.toFixed(metric.decimals) + (metric.suffix ?? '') : `${metric.target}${metric.suffix ?? ''}`}
                icon={metric.icon}
                compact
              />
            ))}
          </div>
        </AppChrome>
      </div>
    </PortraitSceneShell>
  );
};
