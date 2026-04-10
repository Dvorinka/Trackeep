import {interpolate, staticFile} from 'remotion';
import type {RoutePreviewBeat} from '../data/types';
import {IconBadge} from './IconBadge';
import {trackeepTheme} from '../theme/trackeep';

interface RoutePreviewCardProps {
  beat: RoutePreviewBeat;
  progress: number;
  width: number;
  height: number;
  x: number;
  y: number;
  emphasis?: boolean;
}

export const RoutePreviewCard = ({beat, progress, width, height, x, y, emphasis = false}: RoutePreviewCardProps) => {
  const translateY = interpolate(progress, [0, 1], [22, 0]);
  const scale = interpolate(progress, [0, 1], [0.93, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        borderRadius: emphasis ? 30 : 26,
        overflow: 'hidden',
        border: `1px solid ${trackeepTheme.colors.borderStrong}`,
        background: 'rgba(7, 10, 15, 0.9)',
        opacity: progress,
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        boxShadow: emphasis ? '0 36px 120px rgba(0, 0, 0, 0.52)' : '0 24px 70px rgba(0, 0, 0, 0.38)'
      }}
    >
      <div
        style={{
          position: 'relative',
          height: Math.round(height * 0.72),
          backgroundImage: `url(${staticFile(beat.image)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: `1px solid ${trackeepTheme.colors.border}`
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(5,7,10,0.1) 0%, rgba(5,7,10,0) 42%, rgba(5,7,10,0.52) 100%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            padding: '6px 10px',
            borderRadius: trackeepTheme.radius.pill,
            border: `1px solid ${trackeepTheme.colors.borderStrong}`,
            background: 'rgba(4, 8, 14, 0.84)',
            color: trackeepTheme.colors.text,
            fontSize: emphasis ? 12 : 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase'
          }}
        >
          {beat.label}
        </div>
      </div>
      <div style={{padding: emphasis ? '22px 24px 24px' : '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: emphasis ? 12 : 10}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <IconBadge icon={beat.icon} size={15} />
          <div style={{fontSize: emphasis ? 24 : 19, fontWeight: 700, color: trackeepTheme.colors.text, letterSpacing: '-0.045em'}}>{beat.title}</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          {beat.lines.map((line) => (
            <div key={line} style={{fontSize: emphasis ? 15 : 13, lineHeight: 1.38, color: trackeepTheme.colors.textMuted}}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
