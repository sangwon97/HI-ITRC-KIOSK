import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import aiIcon from '../../../assets/icons/ai.png';
import documentIcon from '../../../assets/icons/document.png';
import mapIcon from '../../../assets/icons/map.png';
import searchIcon from '../../../assets/icons/search.png';
import { categories } from '../../../data/booths';
import { loadBoothPositionMaps } from '../../../data/boothPositionCsv';
import MapScene from '../../../three/MapScene';
import MapSearchOverlay from '../MapSearchOverlay';
import { DEFAULT_MAP_CAMERA } from '../../../three/mapCameraConfig';
import { computeBoothPath } from '../../../utils/mapPath';
import BoothBrowser from '../../booth-guide/BoothBrowser';
import BoothDetail from '../../booth-guide/BoothDetail';
import CenterInfo from '../../booth-guide/CenterInfo';
import PosterDetail from '../../booth-guide/PosterDetail';
import SearchScreen from '../../booth-search/SearchScreen';
import InfoScreen from '../../event-info/InfoScreen';
import './styles.css';

const CAT_HEX = {
  ai_semiconductor:  0x6c63ff,
  bio_healthcare:    0x00c896,
  cloud_security:    0xff6b6b,
  ai_bigdata:        0xf7b731,
  ai_platform:       0x45aaf2,
  next_gen_comm:     0x26de81,
  immersive_sw:      0xfd9644,
  robotics_mobility: 0xeb3b5a,
  quantum:           0xa29bfe,
  ict_industry:      0x20bf6b,
};

function hexStr(v) {
  return '#' + (v ?? 0x888888).toString(16).padStart(6, '0');
}

const NAV_ITEMS = [
  { id: 'map',           label: '전시장 지도', sub: 'Exhibition Map',  icon: mapIcon,      screen: null },
  { id: 'booth-browser', label: '부스 안내',   sub: 'Booth Guide',     icon: aiIcon,       screen: 'booth-browser' },
  { id: 'search',        label: '부스 검색',   sub: 'Search',          icon: searchIcon,   screen: 'search' },
  { id: 'info',          label: '행사 안내',   sub: 'Event Guide',     icon: documentIcon, screen: 'info' },
];

const PANEL_TITLES = {
  'booth-browser': '부스 안내',
  'booth-detail': '센터 소개',
  poster: '포스터 뷰',
  center: '센터 소개',
  search: '부스 검색',
  info: '행사 안내',
};

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
  const [pathPoints, setPathPoints] = useState(null);
  const [boothPositionMaps, setBoothPositionMaps] = useState({
    boothPositions: {},
    boothFrontPositions: {},
  });
  const [currentDateTime, setCurrentDateTime] = useState(() => formatDateTimeParts(new Date()));
  const [showLegendHint, setShowLegendHint] = useState(true);

  const [showMapSearch, setShowMapSearch] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let disposed = false;

    loadBoothPositionMaps()
      .then((maps) => {
        if (!disposed) {
          setBoothPositionMaps(maps);
        }
      })
      .catch((error) => {
        console.error('Failed to load booth position CSV files.', error);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const handleSelect = useCallback(booth => {
    setSelected(booth);
    if (booth) {
      setPathPoints(computeBoothPath(
        booth.id,
        boothPositionMaps.boothPositions,
        boothPositionMaps.boothFrontPositions,
      ));
    }
  }, [boothPositionMaps]);

  const handleClose = useCallback(() => {
    setSelected(null);
    setPathPoints(null);
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

  const cat = selected ? categories.find(c => c.id === selected.category) : null;
  const catColor = selected ? hexStr(CAT_HEX[selected.category]) : '#00b4ff';
  const panelTitle = activePanel ? PANEL_TITLES[activePanel] : null;
  const activeViewTitle = panelTitle ?? '전시장 지도';
  const activeViewSubtitle = activePanel ? 'ITRC 2026 Kiosk Content' : 'Exhibition Map';
  const boothPayload = normalizeBoothPayload(data);
  const activeNavScreen = getActiveNavScreen(activePanel);

  useEffect(() => {
    if (activePanel) {
      setSelected(null);
      setPathPoints(null);
      setShowMapSearch(false);
    }
  }, [activePanel]);

  useEffect(() => {
    if (!activePanel) {
      setShowLegendHint(true);
    }
  }, [activePanel]);

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
    if (!selected) {
      return;
    }

    setPathPoints(computeBoothPath(
      selected.id,
      boothPositionMaps.boothPositions,
      boothPositionMaps.boothFrontPositions,
    ));
  }, [boothPositionMaps, selected]);

  const renderMainContent = () => {
    if (!activePanel) {
      return (
        <div className="map3d-canvas-wrapper">
          <Canvas
            style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
            camera={{ position: DEFAULT_MAP_CAMERA.position, fov: 38, near: 0.5, far: 400 }}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            dpr={Math.min(window.devicePixelRatio, 1.5)}
            onCreated={({ gl }) => {
              gl.setClearColor(new THREE.Color(0xeef5fc));
            }}
          >
            <Suspense fallback={null}>
              <MapScene
                onSelect={handleSelect}
                onHover={() => {}}
                selectedBooth={selected}
                pathPoints={pathPoints}
                boothPositions={boothPositionMaps.boothPositions}
                boothFrontPositions={boothPositionMaps.boothFrontPositions}
                controlsRef={controlsRef}
                resetSignal={resetSignal}
              />
            </Suspense>
          </Canvas>

          <div className="map3d-hint">
            드래그: 회전 &middot; 우클릭/두 손가락: 이동 &middot; 스크롤/핀치: 줌 &middot; 부스 클릭: 상세
          </div>

          <button className="map3d-map-search-btn" onClick={() => setShowMapSearch(true)}>
            <img src={searchIcon} alt="" className="map3d-map-search-btn-icon" />
            검색
          </button>

          {showMapSearch && (
            <MapSearchOverlay
              onClose={() => setShowMapSearch(false)}
              onSelect={(booth) => { handleSelect(booth); setShowMapSearch(false); }}
            />
          )}

          <div className="map3d-legend-help">
            <button
              className={`map3d-legend-toggle ${showLegendHint ? 'map3d-legend-toggle-active' : ''}`}
              onClick={() => setShowLegendHint((visible) => !visible)}
              aria-label="전시 카테고리 도움말 보기"
            >
              ?
            </button>

            {showLegendHint && (
              <div className="map3d-legend-overlay">
                <div className="map3d-legend-overlay-header">
                  <span className="map3d-legend-overlay-title">전시 카테고리 안내</span>
                </div>
                <div className="map3d-legend-overlay-list">
                  {categories.map((category) => (
                    <div key={category.id} className="map3d-legend-overlay-item">
                      <span
                        className="map3d-legend-dot"
                        style={{ background: hexStr(CAT_HEX[category.id]) }}
                      />
                      <span>{category.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {pathPoints && selected && (
            <div className="map3d-route-badge">
              <span>📍</span>
              <span>현재위치 → {selected.name} 경로 안내 중</span>
            </div>
          )}

          {selected && (
            <div className="map3d-panel" style={{ '--cat-color': catColor }}>
              <button className="map3d-panel-close" onClick={handleClose}>✕</button>
              <div className="map3d-panel-cat">
                <span>{cat?.icon}</span>
                <span>{cat?.label}</span>
              </div>
              <h3 className="map3d-panel-name">{selected.name}</h3>
              <div className="map3d-panel-univ">
                <span>🎓</span>
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
      return <BoothBrowser embedded data={data} navigate={navigate} goHome={goHome} />;
    }

    if (activePanel === 'search') {
      return <SearchScreen embedded navigate={navigate} goHome={goHome} />;
    }

    if (activePanel === 'info') {
      return <InfoScreen embedded navigate={navigate} goHome={goHome} />;
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
        <BoothDetail
          embedded
          data={boothPayload}
          navigate={navigate}
          goBack={handleBoothBack}
          goHome={goHome}
        />
      );
    }

    if (activePanel === 'center') {
      return (
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
      );
    }

    if (activePanel === 'poster') {
      return (
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
          <div className="map3d-logo-badge">
            <span className="map3d-logo-bars">||</span>
            <span>ITRC</span>
          </div>
          <div className="map3d-logo-info">
            <strong>ITRC 2026</strong>
            <span>인재양성대전</span>
          </div>
        </div>

        <p className="map3d-sidebar-desc">
          AI·ICT 연구 성과를 한자리에서 만날 수 있는 곳, ITRC 인재양성대전입니다.
        </p>

        <div className="map3d-sidebar-divider" />

        {/* 네비게이션 */}
        <nav className="map3d-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`map3d-nav-item ${(item.screen ?? 'home') === activeNavScreen ? 'map3d-nav-active' : ''}`}
              onClick={() => handlePanelNavigate(item.screen)}
            >
              <span className="map3d-nav-icon">
                <img src={item.icon} alt="" />
              </span>
              <span className="map3d-nav-text">
                <span className="map3d-nav-label">{item.label}</span>
                <span className="map3d-nav-sub">{item.sub}</span>
              </span>
            </button>
          ))}
        </nav>

      </aside>

      {/* ── 우측 지도 영역 ── */}
      <div className="map3d-map-area">

        {/* 상단 헤더 */}
        <div className="map3d-header">
          <div className="map3d-header-info">
            <span className="map3d-header-title">{activeViewTitle}</span>
            <span className="map3d-header-sep">/</span>
            <div className="map3d-header-meta">
              <span className="map3d-header-main">{activeViewSubtitle}</span>
              <span className="map3d-header-sub">COEX 서울 · Hall A&amp;B · 4월 22–24일</span>
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
          </div>
        </div>

        <div className="map3d-content-area">
          {renderMainContent()}
        </div>
      </div>{/* /map-area */}
    </div>
  );
}
