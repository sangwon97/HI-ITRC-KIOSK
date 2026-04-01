import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import './styles/global.css';

import IdleScreen    from './screens/IdleScreen';
const Map3DScreen   = lazy(() => import('./screens/Map3DScreen'));  // Three.js lazy load
import BoothBrowser  from './screens/BoothBrowser';
import BoothDetail   from './screens/BoothDetail';
import PosterDetail  from './screens/PosterDetail';
import CenterInfo    from './screens/CenterInfo';
import InfoScreen    from './screens/InfoScreen';
import SearchScreen  from './screens/SearchScreen';

const IDLE_TIMEOUT = 120_000; // 120초(2분) 후 대기 화면으로

export default function App() {
  // home = 3D 맵 화면
  const [screen, setScreen] = useState('idle');
  const [screenStack, setScreenStack] = useState([]);
  const [screenData, setScreenData] = useState(null);
  const idleTimer = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (screen !== 'idle') {
      idleTimer.current = setTimeout(() => {
        setScreen('idle');
        setScreenStack([]);
        setScreenData(null);
      }, IDLE_TIMEOUT);
    }
  }, [screen]);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown'];
    events.forEach(e => document.addEventListener(e, resetIdleTimer, true));
    return () => events.forEach(e => document.removeEventListener(e, resetIdleTimer, true));
  }, [resetIdleTimer]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [screen, resetIdleTimer]);

  const navigate = useCallback((toScreen, data = null) => {
    setScreenStack(prev => [...prev, { screen, screenData }]);
    setScreen(toScreen);
    setScreenData(data);
  }, [screen, screenData]);

  const goBack = useCallback(() => {
    const stack = [...screenStack];
    const prev = stack.pop();
    if (prev) {
      setScreenStack(stack);
      setScreen(prev.screen);
      setScreenData(prev.screenData);
    } else {
      setScreen('home');
      setScreenData(null);
    }
  }, [screenStack]);

  const goHome = useCallback(() => {
    setScreen('home');
    setScreenStack([]);
    setScreenData(null);
  }, []);

  const startKiosk = useCallback(() => {
    setScreen('home');
    setScreenStack([]);
    setScreenData(null);
  }, []);

  const screenProps = { navigate, goBack, goHome, data: screenData };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-deep)' }}>
      {screen === 'idle'         && <IdleScreen onStart={startKiosk} />}
      {screen === 'home'         && (
        <Suspense fallback={<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:'1rem'}}>전시장 로딩 중...</div>}>
          <Map3DScreen {...screenProps} />
        </Suspense>
      )}
      {screen === 'booth-browser'&& <BoothBrowser {...screenProps} />}
      {screen === 'booth-detail' && <BoothDetail {...screenProps} />}
      {screen === 'poster'       && <PosterDetail {...screenProps} />}
      {screen === 'center'       && <CenterInfo {...screenProps} />}
      {screen === 'info'         && <InfoScreen {...screenProps} />}
      {screen === 'search'       && <SearchScreen {...screenProps} />}
    </div>
  );
}
