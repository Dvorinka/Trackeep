import {useCurrentFrame} from 'remotion';
import {AppChrome} from '../../components/AppChrome';
import {IconBadge} from '../../components/IconBadge';
import {timeHeadline, timeOverviewStats} from '../../data/trailerData';
import {formatMetricValue, formatStopwatch} from '../../lib/format';
import {easedProgress} from '../../lib/motion';
import {trackeepTheme} from '../../theme/trackeep';
import {PortraitSceneShell} from './PortraitSceneShell';

const panelStyle = {
  borderRadius: 22,
  border: `1px solid ${trackeepTheme.colors.border}`,
  background: 'rgba(255,255,255,0.02)',
  padding: '22px 24px'
};

export const PortraitTimeTrackingScene = () => {
  const frame = useCurrentFrame();
  const timerProgress = easedProgress(frame, 12, 96);
  const timerSeconds = Math.round(315 * timerProgress);
  const billableProgress = easedProgress(frame, 34, 72);

  return (
    <PortraitSceneShell frame={frame} beat={timeHeadline}>
      <div style={{position: 'absolute', left: 90, top: 470}}>
        <AppChrome frame={frame} activeNav="Time Tracking" sidebarItems={[]} showSidebar={false} width={900} height={1050}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{...panelStyle, minHeight: 360, display: 'flex', flexDirection: 'column', gap: 18}}>
              <div style={{fontSize: 110, fontWeight: 700, letterSpacing: '-0.07em', color: trackeepTheme.colors.text, textAlign: 'center'}}>{formatStopwatch(timerSeconds)}</div>
              <div style={{textAlign: 'center', fontSize: 30, color: trackeepTheme.colors.textMuted}}>Stopped</div>
              <div style={{height: 60, borderRadius: 12, border: `1px solid ${trackeepTheme.colors.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', color: trackeepTheme.colors.textMuted, fontSize: 22}}>What are you working on? (optional)</div>
              <div style={{height: 60, borderRadius: 12, border: `1px solid ${trackeepTheme.colors.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', color: trackeepTheme.colors.textMuted, fontSize: 22}}>Add tags...</div>
              <div style={{height: 60, borderRadius: 12, background: trackeepTheme.colors.primary, color: '#03131d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700}}>Start</div>
            </div>
            <div style={{...panelStyle}}>
              <div style={{fontSize: 28, fontWeight: 700, color: trackeepTheme.colors.text, marginBottom: 18}}>Today's Overview</div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
                {timeOverviewStats.map((stat, index) => {
                  const progress = index === 2 ? billableProgress : easedProgress(frame, 22 + index * 8, 56);
                  const animatedValue = stat.target * progress;
                  const value = stat.label === 'Total Time Today'
                    ? formatStopwatch(Math.round(animatedValue))
                    : formatMetricValue(stat, animatedValue);
                  return (
                    <div key={stat.label} style={{display: 'flex', alignItems: 'center', gap: 12}}>
                      <IconBadge icon={stat.icon} />
                      <div>
                        <div style={{fontSize: 34, fontWeight: 700, color: trackeepTheme.colors.text, letterSpacing: '-0.05em'}}>{value}</div>
                        <div style={{fontSize: 18, color: trackeepTheme.colors.textMuted}}>{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AppChrome>
      </div>
    </PortraitSceneShell>
  );
};
