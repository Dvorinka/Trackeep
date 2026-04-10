import trackeepLogo from '../../../../frontend/public/trackeep.svg';
import {Img, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {trackeepTheme} from '../../theme/trackeep';

export const PortraitColdOpenScene = () => {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [0, 28], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const lineWidth = interpolate(frame, [18, 60], [0, 240], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <Backdrop>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28}}>
        <div
          style={{
            width: 136,
            height: 136,
            borderRadius: 36,
            border: `1px solid ${trackeepTheme.colors.borderStrong}`,
            background: 'rgba(57,185,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${logoScale})`
          }}
        >
          <Img src={trackeepLogo} style={{width: 72, height: 72}} />
        </div>
        <div style={{fontSize: 88, fontWeight: 700, letterSpacing: '-0.08em', color: trackeepTheme.colors.text}}>Trackeep</div>
        <div style={{fontSize: 70, fontWeight: 700, lineHeight: 0.94, letterSpacing: '-0.06em', color: trackeepTheme.colors.text, textAlign: 'center', maxWidth: 860}}>
          Track everything that matters.
        </div>
        <div
          style={{
            width: lineWidth,
            height: 5,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${trackeepTheme.colors.primary} 0%, rgba(57,185,255,0) 100%)`
          }}
        />
      </div>
    </Backdrop>
  );
};
