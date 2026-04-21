import { useEffect, useRef, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import itrcLogo from '../../../assets/icons/ITRC_logo.jpg';
import searchIcon from '../../../assets/icons/keyboard_keys.svg';
import { categories, CATEGORY_MAP } from '../../../data/booths';
import { loadBoothPositionMaps } from '../../../data/boothPositionCsv';
import {
  getCurrentKioskRouteStart,
  loadKioskInfoPositions,
  resolveCurrentKioskInfoId,
} from '../../../data/kioskInfoPositionCsv';
import labLogo from '../../../assets/Hi.png';
import { loadNavmeshGrid } from '../../../data/navmeshGrid';
import { DEFAULT_MAP_CAMERA } from '../../../three/mapCameraConfig';
import { getCategoryPresentation } from '../../../utils/categoryPresentation';
import { computeBoothPath } from '../../../utils/mapPath';
import './styles.css';

const MapSearchOverlay = lazy(() => import('../MapSearchOverlay'));
const BoothBrowser = lazy(() => import('../../booth-guide/BoothBrowser'));
const BoothDetail = lazy(() => import('../../booth-guide/BoothDetail'));
const CenterInfo = lazy(() => import('../../booth-guide/CenterInfo'));
const PosterDetail = lazy(() => import('../../booth-guide/PosterDetail'));
const SearchScreen = lazy(() => import('../../booth-search/SearchScreen'));
const InfoScreen = lazy(() => import('../../event-info/InfoScreen'));
const MapScene = lazy(() => import('../../../three/MapScene'));

const CAT_HEX = Object.fromEntries(categories.map((category) => [category.id, category.color]));
const NOOP = () => {};

function MapLoadingOverlay() {
  return (
    <div className="map3d-loading-overlay" aria-live="polite" aria-busy="true">
      <div className="map3d-loading-card" aria-hidden="true">
        <div className="map3d-loading-dots" aria-hidden="true">
          <span className="map3d-loading-dot" />
          <span className="map3d-loading-dot" />
          <span className="map3d-loading-dot" />
        </div>
      </div>
    </div>
  );
}

function hexStr(v) {
  if (typeof v === 'string') {
    return v;
  }

  return '#' + (v ?? 0x888888).toString(16).padStart(6, '0');
}

const NAV_ITEMS = [
  { id: 'map',           label: '전시장 지도', sub: 'Exhibition Map',  screen: null },
  { id: 'booth-browser', label: '부스 안내',   sub: 'Booth Guide',     screen: 'booth-browser' },
  { id: 'search',        label: '부스 검색',   sub: 'Search',          screen: 'search' },
  {
    id: 'info',
    label: '행사 안내',
    sub: 'Event Guide',
    screen: 'info',
    children: [
      { id: 'overview', label: '행사 개요', tab: 'overview' },
      { id: 'programs', label: '프로그램', tab: 'programs' },
      { id: 'zones', label: '전시 구역', tab: 'zones' },
    ],
  },
];

const PANEL_TITLES = {
  'booth-browser': '부스 안내',
  'booth-detail': '센터 소개',
  poster: '포스터 뷰',
  center: '센터 소개',
  search: '부스 검색',
  info: '행사 안내',
};

const COEX_WEATHER = {
  latitude: 37.5125,
  longitude: 127.0589,
  label: '서울 코엑스',
};
const EVENT_START_DATE = new Date('2026-04-22T00:00:00+09:00');
const EVENT_END_DATE = new Date('2026-04-24T23:59:59+09:00');
const EVENT_VENUE_LABEL = 'COEX A홀';
const EVENT_PERIOD_LABEL = '2026.04.22 - 04.24';

function getWeatherPresentation(weatherCode) {
  if (weatherCode === 0) {
    return { icon: '☀', label: '맑음' };
  }

  if ([1, 2, 3].includes(weatherCode)) {
    return { icon: '⛅', label: '구름 많음' };
  }

  if ([45, 48].includes(weatherCode)) {
    return { icon: '🌫', label: '안개' };
  }

  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return { icon: '🌦', label: '이슬비' };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return { icon: '🌧', label: '비' };
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return { icon: '🌨', label: '눈' };
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return { icon: '⛈', label: '뇌우' };
  }

  return { icon: '☁', label: '흐림' };
}

function formatDateTimeParts(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return {
    dateLabel: `${year}년 ${month}월 ${day}일`,
    meridiem,
    timeLabel: `${displayHour}:${minutes}`,
  };
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getEventTimeline(date) {
  const today = startOfLocalDay(date);
  const startDay = startOfLocalDay(EVENT_START_DATE);
  const endDay = startOfLocalDay(EVENT_END_DATE);
  const diffFromStart = Math.round((today - startDay) / 86400000);
  const diffToStart = Math.ceil((startDay - today) / 86400000);
  const diffToEnd = Math.ceil((endDay - today) / 86400000);

  if (diffFromStart >= 0 && diffFromStart <= 2) {
    return {
      statusLabel: `전시회 ${diffFromStart + 1}일차`,
      remainingLabel: diffFromStart === 2 ? '오늘 종료' : `종료까지 ${2 - diffFromStart}일`,
    };
  }

  if (today < startDay) {
    return {
      statusLabel: '전시회 오픈 예정',
      remainingLabel: `전시회까지 ${diffToStart}일`,
    };
  }

  return {
    statusLabel: '전시회 종료',
    remainingLabel: `종료 후 ${Math.max(1, -diffToEnd)}일`,
  };
}

function normalizeBoothPayload(data) {
  if (!data) {
    return null;
  }

  if (data.booth) {
    return {
      booth: data.booth,
      categoryId: data.categoryId ?? data.booth?.category ?? null,
      source: data.source ?? null,
    };
  }

  return {
    booth: data,
    categoryId: data.category ?? null,
    source: null,
  };
}

function getActiveNavScreen(activePanel) {
  if (activePanel === 'booth-browser' || activePanel === 'booth-detail' || activePanel === 'center' || activePanel === 'poster') {
    return 'booth-browser';
  }

  return activePanel ?? 'home';
}

export default function Map3DScreen({ navigate, goHome, activePanel, data }) {
  const controlsRef  = useRef();
  const [selected, setSelected]   = useState(null);
  const [boothPositionMaps, setBoothPositionMaps] = useState({
    boothPositions: {},
    boothFrontPositions: {},
  });
  const [kioskInfoPositions, setKioskInfoPositions] = useState({});
  const [navmeshGrid, setNavmeshGrid] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(() => formatDateTimeParts(new Date()));
  const [weatherInfo, setWeatherInfo] = useState(null);

  const [showMapSearch, setShowMapSearch] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [introSignal, setIntroSignal] = useState(0);
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
  const [pendingMapIntro, setPendingMapIntro] = useState(false);
  const [isMapSceneReady, setIsMapSceneReady] = useState(false);
  const [showBoothLabels, setShowBoothLabels] = useState(true);
  const [currentKioskInfoId, setCurrentKioskInfoId] = useState(() => resolveCurrentKioskInfoId());

  useEffect(() => {
    const syncCurrentKiosk = () => {
      setCurrentKioskInfoId(resolveCurrentKioskInfoId());
    };

    syncCurrentKiosk();
    window.addEventListener('popstate', syncCurrentKiosk);
    window.addEventListener('hashchange', syncCurrentKiosk);

    return () => {
      window.removeEventListener('popstate', syncCurrentKiosk);
      window.removeEventListener('hashchange', syncCurrentKiosk);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    Promise.all([
      loadBoothPositionMaps(),
      loadKioskInfoPositions(),
      loadNavmeshGrid(),
    ])
      .then(([maps, loadedKioskInfoPositions, loadedNavmeshGrid]) => {
        if (!disposed) {
          setBoothPositionMaps(maps);
          setKioskInfoPositions(loadedKioskInfoPositions);
          setNavmeshGrid(loadedNavmeshGrid);
        }
      })
      .catch((error) => {
        console.error('Failed to load map scene assets.', error);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const handleSelect = useCallback(booth => {
    setSelected(booth);
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
    setResetSignal(s => s + 1);
  }, []);

  const handleNavigate = useCallback(() => {
    if (selected) {
      navigate('booth-detail', {
        booth: selected,
        categoryId: selected.category,
        source: 'map',
      });
    }
  }, [selected, navigate]);

  const handlePanelNavigate = useCallback((screen) => {
    if ((screen ?? 'home') === (activePanel ?? 'home')) {
      return;
    }

    if (screen === null) {
      goHome();
      return;
    }

    navigate(screen);
  }, [activePanel, goHome, navigate]);

  const cat = selected ? CATEGORY_MAP.get(selected.category) : null;
  const catColor = selected ? hexStr(CAT_HEX[selected.category]) : '#79a8ca';
  const categoryPresentation = getCategoryPresentation(catColor);
  const eventTimeline = getEventTimeline(new Date());
  const boothPayload = normalizeBoothPayload(data);
  const activeNavScreen = getActiveNavScreen(activePanel);
  const activeInfoTab = activePanel === 'info' ? (data?.tab ?? 'overview') : null;
  const currentRouteStart = useMemo(
    () => getCurrentKioskRouteStart(kioskInfoPositions, currentKioskInfoId),
    [currentKioskInfoId, kioskInfoPositions],
  );
  const pathPoints = useMemo(() => {
    if (!selected) {
      return null;
    }

    return computeBoothPath(
      selected.id,
      boothPositionMaps.boothPositions,
      boothPositionMaps.boothFrontPositions,
      currentRouteStart ?? undefined,
    );
  }, [boothPositionMaps, currentRouteStart, selected]);

  useEffect(() => {
    if (activePanel) {
      setSelected(null);
      setShowMapSearch(false);
    }
  }, [activePanel]);

  useEffect(() => {
    if (!activePanel) {
      setSelected(null);
      setShowMapSearch(false);
      setResetSignal((signal) => signal + 1);
      setPendingMapIntro(true);
      setIsMapSceneReady(false);
    }

    return undefined;
  }, [activePanel]);

  const handleSceneReady = useCallback(() => {
    setIsMapSceneReady(true);

    setPendingMapIntro((current) => {
      if (!current) {
        return current;
      }

      setIntroSignal((signal) => signal + 1);
      return false;
    });
  }, []);

  useEffect(() => {
    if (activeNavScreen === 'info') {
      setInfoMenuOpen(true);
      return;
    }

    setInfoMenuOpen(false);
  }, [activeNavScreen]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(formatDateTimeParts(new Date()));
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      try {
        const params = new URLSearchParams({
          latitude: String(COEX_WEATHER.latitude),
          longitude: String(COEX_WEATHER.longitude),
          current: 'temperature_2m,weather_code',
          timezone: 'Asia/Seoul',
          forecast_days: '1',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`);
        }

        const payload = await response.json();
        const current = payload?.current;
        if (!current || typeof current.temperature_2m !== 'number') {
          throw new Error('Weather payload is missing current conditions.');
        }

        const presentation = getWeatherPresentation(current.weather_code);
        if (!cancelled) {
          setWeatherInfo({
            ...presentation,
            temperature: Math.round(current.temperature_2m),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setWeatherInfo(null);
        }
        console.error('Failed to load COEX weather.', error);
      }
    };

    loadWeather();
    const weatherIntervalId = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(weatherIntervalId);
    };
  }, []);

  const renderMainContent = () => {
    if (!activePanel) {
      return (
        <div className="map3d-canvas-wrapper">
          {!isMapSceneReady && (
            <MapLoadingOverlay />
          )}
          <Canvas
            style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
            camera={{ position: DEFAULT_MAP_CAMERA.position, fov: 38, near: 0.5, far: 400 }}
            gl={{ alpha: false, antialias: false, powerPreference: 'high-performance', stencil: false }}
            dpr={[1, 1.25]}
            performance={{ min: 0.85 }}
            frameloop="always"
            onCreated={({ gl }) => {
              gl.setClearColor(new THREE.Color(0xdadada));
            }}
          >
            <Suspense fallback={null}>
              <MapScene
                onSelect={handleSelect}
                onHover={NOOP}
                selectedBooth={selected}
                pathPoints={pathPoints}
                boothPositions={boothPositionMaps.boothPositions}
                boothFrontPositions={boothPositionMaps.boothFrontPositions}
                navmeshGrid={navmeshGrid}
                controlsRef={controlsRef}
                introSignal={introSignal}
                resetSignal={resetSignal}
                showBoothLabels={showBoothLabels}
                kioskInfoPositions={kioskInfoPositions}
                currentKioskId={currentKioskInfoId}
                routeStartPoint={currentRouteStart}
                onSceneReady={handleSceneReady}
              />
            </Suspense>
          </Canvas>

          <div className="map3d-hint">
            드래그: 회전 &middot; 우클릭/두 손가락: 이동 &middot; 스크롤/핀치: 줌 &middot; 부스 클릭: 상세
          </div>

          <div className="map3d-map-controls">
            <button
              type="button"
              className={`map3d-map-control-btn map3d-label-toggle-btn ${showBoothLabels ? 'map3d-label-toggle-btn-active' : ''}`}
              onClick={() => setShowBoothLabels((current) => !current)}
              aria-label={`센터명 표시 ${showBoothLabels ? '끄기' : '켜기'}`}
              aria-pressed={showBoothLabels}
            >
              <span className="map3d-label-toggle-text">센터명</span>
              <span className="map3d-label-toggle-switch" aria-hidden="true">
                <span className="map3d-label-toggle-thumb" />
              </span>
            </button>
            <button type="button" className="map3d-map-control-btn map3d-map-search-btn" onClick={() => setShowMapSearch(true)}>
              <img src={searchIcon} alt="" className="map3d-map-search-btn-icon" color='#2e6f9f'/>
              <span>검색</span>
            </button>
          </div>

          {showMapSearch && (
            <Suspense fallback={<MapLoadingOverlay />}>
              <MapSearchOverlay
                onClose={() => setShowMapSearch(false)}
                onSelect={(booth) => { handleSelect(booth); setShowMapSearch(false); }}
              />
            </Suspense>
          )}

          <div className={`map3d-route-badge ${selected ? 'map3d-route-badge-active' : 'map3d-route-badge-idle'}`}>
            <span>{selected ? '📍' : ''}</span>
            <span>
              {selected
                ? `현재위치 → ${selected.name} 경로 안내 중`
                : '원하는 부스를 클릭하면 해당 부스의 정보와 위치를 안내해드려요'}
            </span>
          </div>

          {selected && (
            <div
              className="map3d-panel"
              style={{
                '--cat-color': catColor,
                '--cat-border-color': categoryPresentation.borderColor,
                '--cat-text-color': categoryPresentation.textColor,
              }}
            >
              <button className="map3d-panel-close" onClick={handleClose}>✕</button>
              <div className="map3d-panel-cat">
                <span>{cat?.icon}</span>
                <span>{cat?.label}</span>
              </div>
              <h3 className="map3d-panel-name">{selected.name}</h3>
              <div className="map3d-panel-univ">
                <span>{selected.univ}</span>
              </div>
              <button className="map3d-panel-btn" onClick={handleNavigate}>
                <span>부스 상세 보기</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (activePanel === 'booth-browser') {
      return (
        <Suspense fallback={<MapLoadingOverlay />}>
          <BoothBrowser embedded data={data} navigate={navigate} goHome={goHome} />
        </Suspense>
      );
    }

    if (activePanel === 'search') {
      return (
        <Suspense fallback={<MapLoadingOverlay />}>
          <SearchScreen embedded navigate={navigate} goHome={goHome} />
        </Suspense>
      );
    }

    if (activePanel === 'info') {
      return (
        <Suspense fallback={<MapLoadingOverlay />}>
          <InfoScreen embedded data={data} navigate={navigate} goHome={goHome} />
        </Suspense>
      );
    }

    if (activePanel === 'booth-detail') {
      const handleBoothBack = () => {
        if (boothPayload?.source === 'search') {
          navigate('search');
          return;
        }

        if (boothPayload?.source === 'map') {
          goHome();
          return;
        }

        navigate(
          'booth-browser',
          boothPayload?.categoryId ? { activeCategory: boothPayload.categoryId } : null,
        );
      };

      return (
        <Suspense fallback={<MapLoadingOverlay />}>
          <BoothDetail
            embedded
            data={boothPayload}
            navigate={navigate}
            goBack={handleBoothBack}
            goHome={goHome}
          />
        </Suspense>
      );
    }

    if (activePanel === 'center') {
      return (
        <Suspense fallback={<MapLoadingOverlay />}>
          <CenterInfo
            embedded
            data={data}
            goBack={() => navigate('booth-detail', {
              booth: data?.booth,
              categoryId: data?.categoryId ?? data?.booth?.category,
              source: data?.source ?? null,
            })}
            goHome={goHome}
          />
        </Suspense>
      );
    }

    if (activePanel === 'poster') {
      return (
        <Suspense fallback={<MapLoadingOverlay />}>
          <PosterDetail
            embedded
            data={data}
            goBack={() => navigate('booth-detail', {
              booth: data?.booth,
              categoryId: data?.categoryId ?? data?.booth?.category,
              source: data?.source ?? null,
            })}
            goHome={goHome}
          />
        </Suspense>
      );
    }

    return null;
  };

  return (
    <div className="map3d-screen">

      {/* ── 좌측 사이드바 ── */}
      <aside className="map3d-sidebar">

        {/* 로고 */}
        <div className="map3d-sidebar-logo">
          <img className="map3d-sidebar-logo-image" src={itrcLogo} alt="ITRC 2026 인재양성대전" />
          <div className="map3d-logo-info">
            <span className="main-title">인재양성대전</span>
            <span className="sub-title">대학정보통신연구센터협의회</span>
          </div>
        </div>

        {/* <p className="map3d-sidebar-desc">
          AI·ICT 연구 성과를 한자리에서 만날 수 있는 곳,
          ITRC 인재양성대전입니다.
        </p> */}

        {/* <div className="map3d-sidebar-divider" /> */}

        {/* 네비게이션 */}
        <nav className="map3d-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = (item.screen ?? 'home') === activeNavScreen;
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;

            return (
              <div key={item.id} className={`map3d-nav-group ${isActive ? 'map3d-nav-group-active' : ''}`}>
                <button
                  className={`map3d-nav-item ${isActive ? 'map3d-nav-active' : ''}`}
                  onClick={() => {
                    if (hasChildren) {
                      setInfoMenuOpen(true);
                      if (!isActive) {
                        navigate('info', { tab: activeInfoTab ?? item.children[0].tab });
                      }
                      return;
                    }

                    handlePanelNavigate(item.screen);
                  }}
                >
                  <span className="map3d-nav-text">
                    <span className="map3d-nav-label">{item.label}</span>
                    <span className="map3d-nav-sub">{item.sub}</span>
                  </span>
                </button>

                {hasChildren && infoMenuOpen ? (
                  <div className="map3d-nav-children">
                    {item.children.map((child) => {
                      const isChildActive = isActive && activeInfoTab === child.tab;
                      return (
                        <button
                          key={child.id}
                          className={`map3d-nav-child ${isChildActive ? 'map3d-nav-child-active' : ''}`}
                          onClick={() => navigate('info', { tab: child.tab })}
                        >
                          <span className="map3d-nav-child-dot" aria-hidden="true" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="map3d-sidebar-credits">
          <img src={labLogo}className="map3d-sidebar-credits-logo" />
          <div className="map3d-sidebar-credits-text">김진술·오상원·이예원·정광무</div>
          <div className="map3d-sidebar-credits-text">전남대학교 초지능네트워크미디어플랫폼 연구실</div>
          
        </div>

      </aside>

      {/* ── 우측 지도 영역 ── */}
      <div className="map3d-map-area">

        {/* 상단 헤더 */}
        <div className="map3d-header">
          <div className="map3d-header-info">
            <div className="map3d-header-status-badge">{eventTimeline.statusLabel}</div>
            <div className="map3d-header-meta">
              <span className="map3d-header-main">ITRC 인재양성대전 2026</span>
              <span className="map3d-header-sub">
                {EVENT_VENUE_LABEL} · {EVENT_PERIOD_LABEL} · {eventTimeline.remainingLabel}
              </span>
            </div>
          </div>
          <div className="map3d-header-right">
            <div className="map3d-header-clock">
              <span className="map3d-header-date">{currentDateTime.dateLabel}</span>
              <div className="map3d-header-timegroup">
                <span className="map3d-header-meridiem">{currentDateTime.meridiem}</span>
                <span className="map3d-header-time">{currentDateTime.timeLabel}</span>
              </div>
            </div>
            {weatherInfo ? (
              <>
                <span className="map3d-header-divider" aria-hidden="true" />
                <div className="map3d-header-weather" aria-label="현재 날씨">
                  <span className="map3d-header-weather-icon" aria-hidden="true">{weatherInfo.icon}</span>
                  <span className="map3d-header-weather-meta">{weatherInfo.label} {weatherInfo.temperature}°C</span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="map3d-content-area">
          {renderMainContent()}
        </div>
      </div>{/* /map-area */}
    </div>
  );
}
