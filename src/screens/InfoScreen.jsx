import { useState } from 'react';
import { eventInfo } from '../data/eventInfo';
import './InfoScreen.css';

const TABS = [
  { id: 'overview', label: '행사 개요', icon: '📋' },
  { id: 'programs', label: '프로그램', icon: '🎤' },
  { id: 'zones', label: '전시 구역', icon: '🏛️' },
];

export default function InfoScreen({ goBack, goHome, navigate }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="info-screen screen-enter">
      {/* 헤더 */}
      <header className="screen-header is-header">
        <div style={{ width: 80 }} />
        <div>
          <div className="title">행사 안내</div>
          <div className="subtitle">{eventInfo.title}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-back" onClick={goBack}>홈</button>
        </div>
      </header>

      {/* 탭 */}
      <div className="is-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`is-tab ${activeTab === tab.id ? 'is-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="is-content" key={activeTab}>
        {activeTab === 'overview' && (
          <div className="is-tab-content fade-in">
            {/* 히어로 배너 */}
            <div className="is-hero-banner">
              <div className="is-hero-badge">ITRC 인재양성대전 2026</div>
              <h2 className="is-hero-title">{eventInfo.subtitle}</h2>
              <div className="is-hero-meta">
                <div className="is-meta-item">
                  <span>📅</span>
                  <span>{eventInfo.date}</span>
                </div>
                <div className="is-meta-dot" />
                <div className="is-meta-item">
                  <span>📍</span>
                  <span>{eventInfo.venue}</span>
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="is-stats">
              {eventInfo.stats.map((s, i) => (
                <div key={i} className="is-stat-card">
                  <span className="is-stat-value gradient-text">{s.value}</span>
                  <span className="is-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* 행사 소개 */}
            <div className="is-overview-card">
              <h3 className="is-card-title">
                <span>ℹ️</span>
                <span>행사 소개</span>
              </h3>
              <p className="is-overview-text">{eventInfo.overview}</p>
            </div>
          </div>
        )}

        {activeTab === 'programs' && (
          <div className="is-tab-content fade-in">
            <div className="is-programs">
              {eventInfo.programs.map((prog, i) => (
                <div key={i} className="is-program-card">
                  <div className="is-prog-icon">{prog.icon}</div>
                  <div className="is-prog-info">
                    <h3 className="is-prog-title">{prog.title}</h3>
                    <p className="is-prog-desc">{prog.desc}</p>
                    <div className="is-prog-time">
                      <span>🕐</span>
                      <span>{prog.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="is-tab-content fade-in">
            <div className="is-zones">
              {eventInfo.exhibitionZones.map(zone => (
                <button
                  key={zone.id}
                  className="is-zone-card"
                  onClick={() => navigate('booth-browser')}
                >
                  <div className="is-zone-num">{String(zone.id).padStart(2, '0')}</div>
                  <div className="is-zone-icon">{zone.icon}</div>
                  <div className="is-zone-info">
                    <span className="is-zone-label">{zone.label}</span>
                    <span className="is-zone-desc">{zone.desc}</span>
                    <div className="is-zone-sections">
                      {zone.sections.map(s => (
                        <span key={s} className="is-zone-section-badge">{s}</span>
                      ))}
                    </div>
                  </div>
                  <span className="is-zone-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
