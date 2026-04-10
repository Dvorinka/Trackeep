import {interpolate} from 'remotion';
import type {ShowcaseIcon} from '../data/types';
import {IconBadge} from './IconBadge';
import {trackeepTheme} from '../theme/trackeep';

interface SignalBadgeProps {
  x: number;
  y: number;
  progress: number;
  label: string;
  value: string;
  icon: ShowcaseIcon;
}

export const SignalBadge = ({x, y, progress, label, value, icon}: SignalBadgeProps) => {
  const translateY = interpolate(progress, [0, 1], [18, 0]);
  const scale = interpolate(progress, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        minWidth: 180,
        padding: '14px 16px',
        borderRadius: 20,
        background: 'rgba(8, 12, 18, 0.88)',
        border: `1px solid ${trackeepTheme.colors.borderStrong}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: progress,
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        boxShadow: '0 18px 42px rgba(0, 0, 0, 0.3)'
      }}
    >
      <IconBadge icon={icon} size={16} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
        <div style={{fontSize: 28, fontWeight: 700, color: trackeepTheme.colors.text, letterSpacing: '-0.05em'}}>{value}</div>
        <div style={{fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: trackeepTheme.colors.textMuted}}>{label}</div>
      </div>
    </div>
  );
};
