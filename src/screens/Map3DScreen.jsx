import { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { categories } from '../data/booths';
import { boothPositions } from '../data/boothPositions';
import { computeBoothPath } from '../utils/mapPath';
import MapScene from '../three/MapScene';
import './Map3DScreen.css';

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
  { id: 'map',           label: '전시장 지도', sub: 'Exhibition Map',  icon: '🗺',  screen: null },
  { id: 'booth-browser', label: '부스 목록',   sub: 'Booth List',      icon: '🏛',  screen: 'booth-browser' },
  { id: 'search',        label: '부스 검색',   sub: 'Search',          icon: '🔍',  screen: 'search' },
  { id: 'info',          label: '행사 안내',   sub: 'Event Guide',     icon: '📋',  screen: 'info' },
];

export default function Map3DScreen({ navigate, goHome }) {
  const controlsRef  = useRef();
  const [selected, setSelected]   = useState(null);
  const [hoveredBooth, setHovered] = useState(null);
  const [pathPoints, setPathPoints] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);

  const handleSelect = useCallback(booth => {
    setSelected(booth);
    if (booth) {
      setPathPoints(computeBoothPath(booth.id));
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
    setPathPoints(null);
  }, []);

  const handleNavigate = useCallback(() => {
    if (selected) navigate('booth-detail', selected);
  }, [selected, navigate]);

  const handleResetCamera = useCallback(() => {
    setResetSignal(s => s + 1);
  }, []);

  const cat = selected ? categories.find(c => c.id === selected.category) : null;
  const catColor = selected ? hexStr(CAT_HEX[selected.category]) : '#00b4ff';

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
              className={`map3d-nav-item${item.screen === null ? ' map3d-nav-active' : ''}`}
              onClick={() => item.screen && navigate(item.screen)}
            >
              <span className="map3d-nav-icon">{item.icon}</span>
              <span className="map3d-nav-text">
                <span className="map3d-nav-label">{item.label}</span>
                <span className="map3d-nav-sub">{item.sub}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* 카테고리 범례 */}
        <div className="map3d-sidebar-legend">
          <div className="map3d-legend-title">전시 카테고리</div>
          <div className="map3d-legend-list">
            {categories.map(c => (
              <div key={c.id} className="map3d-legend-item">
                <span className="map3d-legend-dot" style={{ background: hexStr(CAT_HEX[c.id]) }} />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* ── 우측 지도 영역 ── */}
      <div className="map3d-map-area">

        {/* 상단 헤더 */}
        <div className="map3d-header">
          <div className="map3d-header-info">
            <span className="map3d-header-title">전시장 지도</span>
            <span className="map3d-header-sep">/</span>
            <div className="map3d-header-meta">
              <span className="map3d-header-main">Exhibition Map</span>
              <span className="map3d-header-sub">COEX 서울 · Hall A&amp;B · 4월 22–24일</span>
            </div>
          </div>
          <button className="map3d-reset-btn" onClick={handleResetCamera}>
            ↺ 초기화
          </button>
        </div>

        {/* 캔버스 래퍼 */}
        <div className="map3d-canvas-wrapper">
          <Canvas
            style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
            camera={{ position: [-3.5, 58, 38], fov: 38, near: 0.5, far: 400 }}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            dpr={Math.min(window.devicePixelRatio, 1.5)}
            onCreated={({ gl }) => {
              gl.setClearColor(new THREE.Color(0xeef5fc));
            }}
          >
            <Suspense fallback={null}>
              <MapScene
                onSelect={handleSelect}
                onHover={setHovered}
                selectedBooth={selected}
                pathPoints={pathPoints}
                controlsRef={controlsRef}
                resetSignal={resetSignal}
              />
            </Suspense>
          </Canvas>

          {/* 조작 힌트 */}
          <div className="map3d-hint">
            드래그: 회전 &middot; 우클릭/두 손가락: 이동 &middot; 스크롤/핀치: 줌 &middot; 부스 클릭: 상세
          </div>

          {/* 경로 안내 배지 */}
          {pathPoints && selected && (
            <div className="map3d-route-badge">
              <span>📍</span>
              <span>입구 → {selected.id} 경로 안내 중</span>
            </div>
          )}

          {/* 선택 패널 */}
          {selected && (
            <div className="map3d-panel" style={{ '--cat-color': catColor }}>
              <button className="map3d-panel-close" onClick={handleClose}>✕</button>
              <div className="map3d-panel-cat">
                <span>{cat?.icon}</span>
                <span>{cat?.label}</span>
              </div>
              <div className="map3d-panel-id">{selected.id}</div>
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

        </div>{/* /canvas-wrapper */}
      </div>{/* /map-area */}
    </div>
  );
}
