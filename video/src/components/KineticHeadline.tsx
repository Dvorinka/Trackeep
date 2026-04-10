import type {CSSProperties} from 'react';
import {interpolate, useVideoConfig} from 'remotion';
import type {HeadlineBeat} from '../data/types';
import {springIn} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';

interface KineticHeadlineProps {
  frame: number;
  beat: HeadlineBeat;
  style?: CSSProperties;
  titleSize?: number;
  subtitleSize?: number;
  kickerSize?: number;
  maxWidth?: number | string;
}

export const KineticHeadline = ({
  frame,
  beat,
  style,
  titleSize,
  subtitleSize = 26,
  kickerSize = 16,
  maxWidth
}: KineticHeadlineProps) => {
  const {fps} = useVideoConfig();
  const entrance = springIn(frame, fps, 0, 34);
  const align = beat.align ?? 'left';
  const centered = align === 'center';
  const resolvedTitleSize = titleSize ?? (centered ? 94 : 84);
  const resolvedMaxWidth = maxWidth ?? (centered ? '100%' : 640);

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: centered ? 1120 : 760,
        textAlign: align,
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [36, 0])}px, 0)`,
        ...style
      }}
    >
      {beat.kicker ? (
        <div
          style={{
            fontSize: kickerSize,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: trackeepTheme.colors.primary
          }}
        >
          {beat.kicker}
        </div>
      ) : null}
      <div
        style={{
          fontSize: resolvedTitleSize,
          lineHeight: 0.96,
          letterSpacing: '-0.05em',
          fontWeight: 700,
          color: trackeepTheme.colors.text,
          maxWidth: resolvedMaxWidth
        }}
      >
        {beat.title}
      </div>
      <div
        style={{
          width: centered ? 260 : 180,
          height: 4,
          borderRadius: trackeepTheme.radius.pill,
          background: `linear-gradient(90deg, ${trackeepTheme.colors.primary} 0%, rgba(57,185,255,0) 100%)`,
          alignSelf: centered ? 'center' : 'flex-start'
        }}
      />
      {beat.subtitle ? (
        <div
          style={{
            fontSize: subtitleSize,
            lineHeight: 1.35,
            color: trackeepTheme.colors.textMuted,
            maxWidth: centered ? 760 : 620
          }}
        >
          {beat.subtitle}
        </div>
      ) : null}
    </div>
  );
};
