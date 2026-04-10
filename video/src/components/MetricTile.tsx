import {interpolate, useVideoConfig} from 'remotion';
import type {ShowcaseIcon} from '../data/types';
import {springIn} from '../lib/motion';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';
import {IconBadge} from './IconBadge';

interface MetricTileProps {
  frame: number;
  delay?: number;
  label: string;
  value: string;
  icon: ShowcaseIcon;
  compact?: boolean;
}

export const MetricTile = ({frame, delay = 0, label, value, icon, compact = false}: MetricTileProps) => {
  const {fps} = useVideoConfig();
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';
  const entrance = springIn(frame, fps, delay, 22);

  return (
    <div
      style={{
        borderRadius: compact ? 16 : 18,
        border: `1px solid ${trackeepTheme.colors.border}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.01))',
        padding: compact ? '16px 18px' : '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: compact ? 10 : 16,
        minHeight: compact ? 104 : 148,
        boxShadow: isLite ? '0 8px 16px rgba(0, 0, 0, 0.14)' : trackeepTheme.shadow.card,
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [24, 0])}px, 0) scale(${interpolate(entrance, [0, 1], [0.96, 1])})`,
        filter: isLite ? 'none' : `blur(${interpolate(entrance, [0, 1], [8, 0])}px)`
      }}
    >
      <IconBadge icon={icon} size={compact ? 14 : 16} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <div style={{fontSize: compact ? 32 : 48, letterSpacing: '-0.05em', fontWeight: 700, color: trackeepTheme.colors.text}}>{value}</div>
        <div style={{fontSize: compact ? 17 : 21, color: trackeepTheme.colors.textMuted, fontWeight: 500}}>{label}</div>
      </div>
    </div>
  );
};
