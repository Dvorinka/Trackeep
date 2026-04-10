import {interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {DemoSurface} from '../components/DemoSurface';
import {HighlightBox} from '../components/HighlightBox';
import {KineticHeadline} from '../components/KineticHeadline';
import {SignalBadge} from '../components/SignalBadge';
import {routeScreens, timeHeadline, timeOverviewStats} from '../data/trailerData';
import {formatMetricValue, formatStopwatch} from '../lib/format';
import {easedProgress} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';

const SCALE = 1520 / 1280;
const s = (value: number) => value * SCALE;

export const TimeTrackingScene = () => {
  const frame = useCurrentFrame();
  const timerProgress = easedProgress(frame, 8, 40);
  const entriesProgress = easedProgress(frame, 16, 28);
  const billableProgress = easedProgress(frame, 24, 30);
  const timerBox = easedProgress(frame, 10, 18);
  const overviewBox = easedProgress(frame, 30, 18);
  const entriesBox = easedProgress(frame, 50, 18);
  const buttonProgress = easedProgress(frame, 24, 14);
  const pulse = 1 + Math.sin(frame / 4) * 0.03;

  return (
    <Backdrop>
      <KineticHeadline frame={frame} beat={timeHeadline} titleSize={66} subtitleSize={22} style={{left: 120, top: 92, width: 650}} />
      <SignalBadge x={1100} y={112} progress={timerProgress} label="Tracked Today" value={formatStopwatch(Math.round(315 * timerProgress))} icon="time" />
      <SignalBadge x={1364} y={112} progress={entriesProgress} label="Entries" value={`${Math.round(timeOverviewStats[1].target * entriesProgress)}`} icon="analytics" />
      <SignalBadge
        x={1570}
        y={112}
        progress={billableProgress}
        label="Billable"
        value={formatMetricValue(timeOverviewStats[2], timeOverviewStats[2].target * billableProgress)}
        icon="productivity"
      />
      <DemoSurface
        frame={frame}
        src={routeScreens.timeTracking}
        style={{left: 260, top: 188}}
        rotateX={{from: 4.5, to: 1.5}}
        rotateY={{from: -4, to: 2}}
        scale={{from: 1.035, to: 1.005}}
        translateX={{from: 42, to: -12}}
        translateY={{from: 20, to: -6}}
        imageScale={{from: 1.03, to: 1.01}}
      >
        <HighlightBox x={s(311)} y={s(120)} width={s(456)} height={s(412)} progress={timerBox} label="Quick capture" />
        <HighlightBox x={s(792)} y={s(120)} width={s(456)} height={s(412)} progress={overviewBox} label="Today's overview" align="top-right" />
        <HighlightBox x={s(312)} y={s(558)} width={s(936)} height={s(154)} progress={entriesBox} label="Billable entry" />
        <div
          style={{
            position: 'absolute',
            left: s(337),
            top: s(362),
            width: s(406),
            height: s(36),
            borderRadius: 10,
            opacity: buttonProgress,
            transform: `scale(${pulse})`,
            boxShadow: `0 0 0 ${interpolate(buttonProgress, [0, 1], [0, 10])}px rgba(57,185,255,0.12), 0 0 46px ${trackeepTheme.colors.primarySoft}`,
            border: `1px solid rgba(57, 185, 255, 0.65)`
          }}
        />
      </DemoSurface>
    </Backdrop>
  );
};
