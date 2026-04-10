import {useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {EndCard} from '../components/EndCard';
import {endCard} from '../data/trailerData';

export const EndCardScene = () => {
  const frame = useCurrentFrame();

  return (
    <Backdrop>
      <EndCard frame={frame} title={endCard.title} subtitle={endCard.subtitle} />
    </Backdrop>
  );
};
