import {Composition} from 'remotion';
import {HEIGHT, FPS, TRAILER_DURATION, WIDTH} from './data/trailerData';
import {Poster} from './Poster';
import {Trailer} from './Trailer';
import {VerticalTrailer} from './VerticalTrailer';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="TrackeepTrailer16x9"
        component={Trailer}
        durationInFrames={TRAILER_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TrackeepTrailer16x9Preview"
        component={Trailer}
        defaultProps={{effects: 'lite', includeAudio: false}}
        durationInFrames={TRAILER_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TrackeepTrailer9x16"
        component={VerticalTrailer}
        durationInFrames={TRAILER_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="TrackeepPoster16x9"
        component={Poster}
        durationInFrames={1}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
