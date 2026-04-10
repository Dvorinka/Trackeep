import {Backdrop} from './components/Backdrop';
import {EndCard} from './components/EndCard';
import {endCard} from './data/trailerData';
import {TrailerConfigProvider} from './lib/trailer-config';

export const Poster = () => {
  return (
    <TrailerConfigProvider layout="landscape" effects="full">
      <Backdrop>
        <EndCard frame={30} title={endCard.title} subtitle={endCard.subtitle} />
      </Backdrop>
    </TrailerConfigProvider>
  );
};
