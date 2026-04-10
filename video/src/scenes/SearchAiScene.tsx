import {useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {DemoSurface} from '../components/DemoSurface';
import {HighlightBox} from '../components/HighlightBox';
import {KineticHeadline} from '../components/KineticHeadline';
import {SignalBadge} from '../components/SignalBadge';
import {routeScreens, searchHeadline} from '../data/trailerData';
import {easedProgress} from '../lib/motion';

const SCALE = 1520 / 1280;
const s = (value: number) => value * SCALE;

export const SearchAiScene = () => {
  const frame = useCurrentFrame();
  const queryProgress = easedProgress(frame, 8, 24);
  const latencyProgress = easedProgress(frame, 18, 24);
  const matchesProgress = easedProgress(frame, 28, 24);
  const inputBox = easedProgress(frame, 14, 18);
  const firstResult = easedProgress(frame, 34, 18);
  const secondResult = easedProgress(frame, 54, 18);

  return (
    <Backdrop>
      <KineticHeadline frame={frame} beat={searchHeadline} titleSize={68} subtitleSize={22} style={{left: 120, top: 92, width: 660}} />
      <SignalBadge x={1260} y={112} progress={queryProgress} label="Query" value="api" icon="search" />
      <SignalBadge x={1472} y={112} progress={latencyProgress} label="Latency" value="37ms" icon="analytics" />
      <SignalBadge x={1684} y={112} progress={matchesProgress} label="Matches" value="2" icon="tasks" />
      <DemoSurface
        frame={frame}
        src={routeScreens.search}
        style={{left: 260, top: 186}}
        rotateX={{from: 4.5, to: 1.25}}
        rotateY={{from: -4.5, to: 2}}
        scale={{from: 1.04, to: 1.005}}
        translateX={{from: 38, to: -10}}
        translateY={{from: 18, to: -4}}
        imageScale={{from: 1.03, to: 1.01}}
      >
        <HighlightBox x={s(304)} y={s(255)} width={s(952)} height={s(48)} progress={inputBox} label="Cross-content query" />
        <HighlightBox x={s(304)} y={s(364)} width={s(952)} height={s(193)} progress={firstResult} label="Task result" />
        <HighlightBox x={s(304)} y={s(574)} width={s(952)} height={s(144)} progress={secondResult} label="Note result" />
      </DemoSurface>
    </Backdrop>
  );
};
