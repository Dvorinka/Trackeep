import {interpolate} from 'remotion';
import {trackeepTheme} from '../theme/trackeep';

interface HighlightBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  progress: number;
  label: string;
  align?: 'top-left' | 'top-right' | 'bottom-left';
}

export const HighlightBox = ({x, y, width, height, progress, label, align = 'top-left'}: HighlightBoxProps) => {
  const badgeLeft = align === 'top-right' ? width - 12 : 16;
  const badgeTop = align === 'bottom-left' ? height + 12 : -18;
  const badgeTransform = align === 'top-right' ? 'translateX(-100%)' : 'none';
  const translateY = interpolate(progress, [0, 1], [18, 0]);
  const scale = interpolate(progress, [0, 1], [0.96, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        borderRadius: 24,
        opacity: progress,
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        border: `1px solid rgba(57, 185, 255, 0.92)`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 0 1px rgba(57,185,255,0.1), 0 0 42px ${trackeepTheme.colors.primarySoft}`,
        background: 'linear-gradient(180deg, rgba(57,185,255,0.12) 0%, rgba(57,185,255,0.02) 100%)',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: badgeLeft,
          top: badgeTop,
          transform: badgeTransform,
          padding: '8px 12px',
          borderRadius: trackeepTheme.radius.pill,
          background: 'rgba(8, 14, 22, 0.88)',
          border: `1px solid ${trackeepTheme.colors.borderStrong}`,
          color: trackeepTheme.colors.text,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          boxShadow: '0 10px 26px rgba(0, 0, 0, 0.26)'
        }}
      >
        {label}
      </div>
    </div>
  );
};
