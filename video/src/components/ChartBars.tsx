import {interpolate, useVideoConfig} from 'remotion';
import {springIn} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';

interface ChartBarsProps {
  frame: number;
  delay?: number;
  values: Array<{label: string; value: number}>;
}

export const ChartBars = ({frame, delay = 0, values}: ChartBarsProps) => {
  const {fps} = useVideoConfig();
  const entrance = springIn(frame, fps, delay, 26);
  const maxValue = Math.max(...values.map((entry) => entry.value));

  return (
    <div
      style={{
        borderRadius: 22,
        border: `1px solid ${trackeepTheme.colors.border}`,
        background: 'rgba(255,255,255,0.02)',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [26, 0])}px, 0)`
      }}
    >
      <div style={{fontSize: 26, fontWeight: 700, color: trackeepTheme.colors.text, letterSpacing: '-0.04em'}}>Weekly Activity</div>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 16, height: 180}}>
        {values.map((entry, index) => {
          const progress = springIn(frame, fps, delay + 10 + index * 4, 24);
          const height = interpolate(progress, [0, 1], [0, (entry.value / maxValue) * 128]);

          return (
            <div key={entry.label + index} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
              <div style={{fontSize: 16, color: trackeepTheme.colors.textMuted}}>{entry.value}</div>
              <div
                style={{
                  width: '100%',
                  maxWidth: 48,
                  height,
                  borderRadius: 18,
                  background: `linear-gradient(180deg, ${trackeepTheme.colors.primary} 0%, rgba(57,185,255,0.25) 100%)`,
                  boxShadow: `0 0 22px ${trackeepTheme.colors.primarySoft}`
                }}
              />
              <div style={{fontSize: 18, fontWeight: 600, color: trackeepTheme.colors.textMuted}}>{entry.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
