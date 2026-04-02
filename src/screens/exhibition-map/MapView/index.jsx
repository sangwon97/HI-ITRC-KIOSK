import { useState } from 'react';
import { booths, categories } from '../../../data/booths';
import './styles.css';

// 섹션별 색상
const SECTION_COLORS = {
  S1: '#0066cc', S2: '#00aa66', S3: '#6600cc',
  S4: '#cc6600', S5: '#cc0066', S6: '#00ccaa',
  S7: '#cc6600', S8: '#6699cc', S9: '#aa00cc', S10: '#00cc44',
};

// 간략화된 전시장 지도 레이아웃 (그리드 위치)
const SECTION_LAYOUT = [
  { id: 'S8', label: '모빌리티·양자', row: 0, col: 0, rowSpan: 2 },
  { id: 'S1', label: '반도체·보안', row: 0, col: 1 },
  { id: 'S3', label: 'AI반도체·의료', row: 0, col: 2 },
  { id: 'S5', label: '블록체인·AI', row: 0, col: 3 },
  { id: 'S7', label: '위성·XR', row: 0, col: 4 },
  { id: 'S9', label: '양자·데이터', row: 1, col: 1 },
  { id: 'S2', label: 'AIoT·스마트ICT', row: 1, col: 2 },
  { id: 'S6', label: '6G·통신', row: 1, col: 3 },
  { id: 'S4', label: '헬스케어·클라우드', row: 2, col: 0, colSpan: 2 },
  { id: 'S10', label: '스마트팜·제조', row: 2, col: 2, colSpan: 2 },
];

const SECTION_DETAILS = {
  S1: { label: 'S1 구역', icon: '💾', desc: '반도체·보안·AI플랫폼', count: 7 },
  S2: { label: 'S2 구역', icon: '📡', desc: 'AIoT·스마트ICT·모빌리티', count: 7 },
  S3: { label: 'S3 구역', icon: '🤖', desc: 'AI반도체·의료AI', count: 7 },
  S4: { label: 'S4 구역', icon: '🧬', desc: '헬스케어·클라우드·보안', count: 8 },
  S5: { label: 'S5 구역', icon: '🔐', desc: '블록체인·범용AI·빅데이터', count: 10 },
  S6: { label: 'S6 구역', icon: '📶', desc: '인간지능증강·6G통신', count: 7 },
  S7: { label: 'S7 구역', icon: '🥽', desc: '위성·XR·메타버스', count: 9 },
  S8: { label: 'S8 구역', icon: '⚛️', desc: '모빌리티·XR·양자기술', count: 12 },
  S9: { label: 'S9 구역', icon: '⚡', desc: '양자·데이터센터·ICT융합', count: 6 },
  S10: { label: 'S10 구역', icon: '🌱', desc: '스마트팜·제조·ICT산업융합', count: 8 },
};

export default function MapView({ navigate, goBack, goHome }) {
  const [selectedSection, setSelectedSection] = useState(null);

  const detail = selectedSection ? SECTION_DETAILS[selectedSection] : null;
  const sectionBooths = selectedSection ? booths.filter(b => b.section === selectedSection) : [];

  return (
    <div className="map-view screen-enter">
      {/* 헤더 */}
      <header className="screen-header mv-header">
        <button className="btn-back" onClick={goBack}>홈</button>
        <div>
          <div className="screen-header title">전시 지도</div>
          <div className="screen-header subtitle">
            {selectedSection
              ? `${detail?.label} · ${sectionBooths.length}개 부스`
              : '구역을 선택하세요'}
          </div>
        </div>
        <div style={{ width: 80 }} />
      </header>

      <div className="mv-body">
        {/* 지도 영역 */}
        <div className="mv-map-area">
          <div className="mv-map-label">ITRC 2026 전시장 · COEX</div>
          <div className="mv-map-grid">
            {/* 입구 표시 */}
            <div className="mv-entrance">
              <span>🚪</span>
              <span>입구</span>
            </div>

            {Object.entries(SECTION_DETAILS).map(([sId, info]) => (
              <button
                key={sId}
                className={`mv-section-block ${selectedSection === sId ? 'mv-section-active' : ''}`}
                style={{
                  '--sec-color': SECTION_COLORS[sId],
                  gridArea: `sec-${sId}`,
                }}
                onClick={() => setSelectedSection(selectedSection === sId ? null : sId)}
                data-section={sId}
              >
                <span className="mv-sec-icon">{info.icon}</span>
                <span className="mv-sec-id">{sId}</span>
                <span className="mv-sec-label">{info.label.replace(' 구역', '')}</span>
                <span className="mv-sec-count">{info.count}부스</span>
              </button>
            ))}
          </div>

          {/* 범례 */}
          <div className="mv-legend">
            <span className="mv-legend-title">범례</span>
            {categories.slice(0, 5).map(c => (
              <div key={c.id} className="mv-legend-item">
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="mv-side">
          {!selectedSection ? (
            <div className="mv-side-hint">
              <span className="mv-hint-icon">👆</span>
              <p>지도에서 구역을 선택하면 해당 구역의 부스 목록을 볼 수 있습니다.</p>
            </div>
          ) : (
            <div className="mv-side-detail fade-in">
              <div className="mv-side-header">
                <span className="mv-side-icon">{detail?.icon}</span>
                <div>
                  <div className="mv-side-title">{detail?.label}</div>
                  <div className="mv-side-desc">{detail?.desc}</div>
                </div>
              </div>

              <div className="mv-booth-list scrollable">
                {sectionBooths.map(b => (
                  <button
                    key={b.id}
                    className="mv-booth-item"
                    onClick={() => navigate('booth-detail', b)}
                  >
                    <span className="mv-booth-id">{b.id}</span>
                    <div className="mv-booth-info">
                      <span className="mv-booth-name">{b.name}</span>
                      <span className="mv-booth-univ">{b.univ}</span>
                    </div>
                    <span>→</span>
                  </button>
                ))}
              </div>

              <button
                className="mv-view-all-btn"
                onClick={() => navigate('booth-browser')}
              >
                <span>전체 부스 보기</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
