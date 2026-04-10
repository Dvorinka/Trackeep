import type {ReactNode} from 'react';
import {Backdrop} from '../../components/Backdrop';
import {KineticHeadline} from '../../components/KineticHeadline';
import type {HeadlineBeat} from '../../data/types';

interface PortraitSceneShellProps {
  frame: number;
  beat: HeadlineBeat;
  children: ReactNode;
}

export const PortraitSceneShell = ({frame, beat, children}: PortraitSceneShellProps) => {
  return (
    <Backdrop>
      <KineticHeadline
        frame={frame}
        beat={{...beat, align: 'center'}}
        titleSize={72}
        subtitleSize={24}
        kickerSize={15}
        maxWidth={860}
        style={{left: 110, top: 112, width: 860, alignItems: 'center'}}
      />
      {children}
    </Backdrop>
  );
};
