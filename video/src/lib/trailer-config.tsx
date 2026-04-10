import type {PropsWithChildren} from 'react';
import {createContext, useContext} from 'react';

export type TrailerLayout = 'landscape' | 'portrait';
export type TrailerEffects = 'full' | 'lite';

interface TrailerConfigValue {
  layout: TrailerLayout;
  effects: TrailerEffects;
}

const TrailerConfigContext = createContext<TrailerConfigValue>({
  layout: 'landscape',
  effects: 'full'
});

export const TrailerConfigProvider = ({children, layout, effects}: PropsWithChildren<TrailerConfigValue>) => {
  return (
    <TrailerConfigContext.Provider value={{layout, effects}}>
      {children}
    </TrailerConfigContext.Provider>
  );
};

export const useTrailerConfig = () => useContext(TrailerConfigContext);
