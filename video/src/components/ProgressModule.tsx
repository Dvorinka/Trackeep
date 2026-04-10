import {interpolate, useVideoConfig} from 'remotion';
import type {ProgressBeat} from '../data/types';
import {easedProgress, springIn} from '../lib/motion';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';
import {IconBadge} from './IconBadge';

interface ProgressModuleProps {
  frame: number;
  delay?: number;
  beat: ProgressBeat;
}

export const ProgressModule = ({frame, delay = 0, beat}: ProgressModuleProps) => {
  const {fps} = useVideoConfig();
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';
  const entrance = springIn(frame, fps, delay, 28);
  const fill = easedProgress(frame, delay + 14, 48) * beat.progress;

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
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [30, 0])}px, 0)`
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <IconBadge icon={beat.icon} />
          <div>
            <div style={{fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: trackeepTheme.colors.text}}>
              {beat.label}
            </div>
            {beat.caption ? (
              <div style={{fontSize: 18, color: trackeepTheme.colors.textMuted, marginTop: 4}}>{beat.caption}</div>
            ) : null}
          </div>
        </div>
        <div style={{fontSize: 30, fontWeight: 700, color: trackeepTheme.colors.text}}>{beat.valueLabel}</div>
      </div>
      <div
        style={{
          width: '100%',
          height: 12,
          borderRadius: trackeepTheme.radius.pill,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)'
        }}
      >
        <div
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            borderRadius: trackeepTheme.radius.pill,
            background: `linear-gradient(90deg, ${trackeepTheme.colors.primary} 0%, rgba(57,185,255,0.52) 100%)`,
            boxShadow: isLite ? 'none' : `0 0 20px ${trackeepTheme.colors.primaryGlow}`
          }}
        />
      </div>
    </div>
  );
};
