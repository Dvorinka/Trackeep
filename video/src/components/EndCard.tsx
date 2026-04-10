import trackeepLogo from '../../../frontend/public/trackeep.svg';
import {Img, interpolate, useVideoConfig} from 'remotion';
import {springIn} from '../lib/motion';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';

interface EndCardProps {
  frame: number;
  title: string;
  subtitle: string;
}

export const EndCard = ({frame, title, subtitle}: EndCardProps) => {
  const {fps, durationInFrames} = useVideoConfig();
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';
  const entrance = springIn(frame, fps, 0, 24);
  const logoEntrance = springIn(frame, fps, 4, 22);
  const titleEntrance = springIn(frame, fps, 8, 20);
  const underline = springIn(frame, fps, 12, 20);
  const subtitleEntrance = springIn(frame, fps, 16, 20);
  const outroFade = interpolate(frame, [durationInFrames - 18, durationInFrames - 7, durationInFrames - 1], [0, 0.3, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 30,
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [26, 0])}px, 0)`
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 820,
          height: 480,
          borderRadius: 999,
          transform: `translate(-50%, -48%) scale(${interpolate(logoEntrance, [0, 1], [0.9, 1.05])})`,
          background: 'radial-gradient(circle, rgba(57,185,255,0.16) 0%, rgba(57,185,255,0.02) 42%, rgba(57,185,255,0) 75%)',
          opacity: logoEntrance
        }}
      />
      <div
        style={{
          width: 154,
          height: 154,
          borderRadius: 40,
          background: 'rgba(57,185,255,0.08)',
          border: `1px solid ${trackeepTheme.colors.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: logoEntrance,
          transform: `scale(${interpolate(logoEntrance, [0, 1], [0.92, 1])})`,
          boxShadow: isLite ? '0 0 30px rgba(57,185,255,0.12)' : `0 0 100px ${trackeepTheme.colors.primarySoft}, 0 28px 80px rgba(0,0,0,0.34)`
        }}
      >
        <Img src={trackeepLogo} style={{width: 86, height: 86}} />
      </div>
      <div style={{fontSize: 16, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: trackeepTheme.colors.primary, opacity: subtitleEntrance}}>
        Plan • Track • Learn
      </div>
      <div
        style={{
          fontSize: 124,
          fontWeight: 700,
          letterSpacing: '-0.08em',
          lineHeight: 0.9,
          color: trackeepTheme.colors.text,
          opacity: titleEntrance,
          transform: `translate3d(0, ${interpolate(titleEntrance, [0, 1], [18, 0])}px, 0)`
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: interpolate(underline, [0, 1], [0, 320]),
          height: 6,
          borderRadius: trackeepTheme.radius.pill,
          background: `linear-gradient(90deg, ${trackeepTheme.colors.primary} 0%, rgba(57,185,255,0) 100%)`
        }}
      />
      <div
        style={{
          width: 980,
          textAlign: 'center',
          fontSize: 30,
          lineHeight: 1.34,
          color: trackeepTheme.colors.textMuted,
          letterSpacing: '-0.03em',
          opacity: subtitleEntrance
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#020305',
          opacity: outroFade
        }}
      />
    </div>
  );
};
