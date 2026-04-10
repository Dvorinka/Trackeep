import type {CSSProperties, ReactNode} from 'react';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';
import {HeaderShell} from './HeaderShell';
import {SidebarShell} from './SidebarShell';

interface AppChromeProps {
  frame: number;
  activeNav: string;
  sidebarItems: string[];
  searchText?: string;
  searchDelay?: number;
  children: ReactNode;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  width?: number;
  height?: number;
  showSidebar?: boolean;
}

export const AppChrome = ({
  frame,
  activeNav,
  sidebarItems,
  searchText,
  searchDelay = 0,
  children,
  style,
  contentStyle,
  width = 1520,
  height = 860,
  showSidebar = true
}: AppChromeProps) => {
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 28,
        overflow: 'hidden',
        border: `1px solid ${trackeepTheme.colors.border}`,
        background: 'rgba(9,11,16,0.82)',
        boxShadow: isLite ? '0 12px 38px rgba(0, 0, 0, 0.24)' : trackeepTheme.shadow.soft,
        display: 'flex',
        backdropFilter: isLite ? 'none' : 'blur(22px)',
        ...style
      }}
    >
      {showSidebar ? <SidebarShell frame={frame} items={sidebarItems} active={activeNav} /> : null}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(10,12,18,0.55)'}}>
        <HeaderShell frame={frame} searchText={searchText} searchDelay={searchDelay} />
        <div style={{flex: 1, padding: '28px 28px 30px', position: 'relative', ...contentStyle}}>{children}</div>
      </div>
    </div>
  );
};
