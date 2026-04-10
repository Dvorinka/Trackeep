import {interpolate, useCurrentFrame} from 'remotion';
import {IconBadge} from '../../components/IconBadge';
import {KineticHeadline} from '../../components/KineticHeadline';
import {RoutePreviewCard} from '../../components/RoutePreviewCard';
import {montageHeadline, montageModules, routePreviews} from '../../data/trailerData';
import {springIn} from '../../lib/motion';
import {trackeepTheme} from '../../theme/trackeep';
import {Backdrop} from '../../components/Backdrop';

export const PortraitMontageScene = () => {
  const frame = useCurrentFrame();
  const centerGlow = springIn(frame, 30, 8, 20);

  return (
    <Backdrop>
      <KineticHeadline
        frame={frame}
        beat={{...montageHeadline, align: 'center'}}
        titleSize={66}
        subtitleSize={24}
        kickerSize={15}
        maxWidth={900}
        style={{left: 90, top: 112, width: 900, alignItems: 'center'}}
      />
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 420,
          width: 860,
          height: 540,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(57,185,255,0.2) 0%, rgba(57,185,255,0.04) 42%, rgba(57,185,255,0) 75%)',
          opacity: centerGlow,
          transform: `scale(${interpolate(centerGlow, [0, 1], [0.9, 1.08])})`
        }}
      />
      <RoutePreviewCard beat={routePreviews[0]} progress={springIn(frame, 30, 10, 20)} x={160} y={418} width={760} height={476} emphasis />
      <RoutePreviewCard beat={routePreviews[1]} progress={springIn(frame, 30, 18, 20)} x={120} y={952} width={390} height={248} />
      <RoutePreviewCard beat={routePreviews[4]} progress={springIn(frame, 30, 24, 20)} x={570} y={952} width={390} height={248} />
      <RoutePreviewCard beat={routePreviews[3]} progress={springIn(frame, 30, 30, 20)} x={160} y={1260} width={760} height={304} />
      <div style={{position: 'absolute', left: 120, top: 1610, width: 840, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16}}>
        {montageModules.map((module, index) => {
          const entry = springIn(frame, 30, 38 + index * 4, 18);
          const floatingY = Math.sin((frame + index * 5) / 12) * 2;
          return (
            <div
              key={module.label}
              style={{
                height: 106,
                borderRadius: 22,
                border: `1px solid ${trackeepTheme.colors.borderStrong}`,
                background: 'rgba(9,11,16,0.76)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '0 22px',
                opacity: entry,
                transform: `translate3d(0, ${interpolate(entry, [0, 1], [20 - floatingY, floatingY])}px, 0) scale(${interpolate(entry, [0, 1], [0.94, 1])})`,
                boxShadow: '0 20px 54px rgba(0, 0, 0, 0.38)'
              }}
            >
              <IconBadge icon={module.icon} size={20} />
              <div style={{fontSize: 30, fontWeight: 700, color: trackeepTheme.colors.text, letterSpacing: '-0.05em'}}>{module.label}</div>
            </div>
          );
        })}
      </div>
    </Backdrop>
  );
};
