import { useEffect, useState } from 'react';
import { eventInfo } from '../../../data/eventInfo';
import './styles.css';

const TABS = [
  { id: 'overview', label: '행사 개요' },
  { id: 'programs', label: '프로그램' },
  { id: 'zones', label: '전시 구역'},
  { id: 'videos', label: '지난 행사 영상' },
];

const LAST_EVENT_VIDEO = {
  title: 'ITRC 인재양성대전 2025',
  description: '현장 영상을 확인해보세요.',
  embedUrl: 'https://www.youtube.com/embed/AdeJtnhrj80?si=41AEyVaNxtILsaQ_',
  watchUrl: 'https://youtu.be/AdeJtnhrj80?si=41AEyVaNxtILsaQ_',
};

export default function InfoScreen({ goBack, goHome, navigate, embedded = false, data = null }) {
  const [activeTab, setActiveTab] = useState(data?.tab ?? 'overview');

  useEffect(() => {
    setActiveTab(data?.tab ?? 'overview');
  }, [data?.tab]);

  return (
    <div className={`info-screen ${embedded ? 'info-screen-embedded' : 'screen-enter'}`}>
      {!embedded && (
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
      )}

      <div className="is-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`is-tab ${activeTab === tab.id ? 'is-tab-active' : ''}`}
            onClick={() => {
              if (embedded && navigate) {
                navigate('info', { tab: tab.id });
                return;
              }
              setActiveTab(tab.id);
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className={`is-content ${activeTab === 'videos' ? 'is-content-video' : ''}`} key={activeTab}>
        {activeTab === 'overview' && (
          <div className="is-tab-content fade-in">
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

            <div className="is-stats">
              {eventInfo.stats.map((s, i) => (
                <div key={i} className="is-stat-card">
                  <span className="is-stat-value gradient-text">{s.value}</span>
                  <span className="is-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="is-overview-card">
              <h3 className="is-card-title">
                <span>ℹ️</span>
                <span>행사 소개</span>
              </h3>
              <p className="is-overview-text">{eventInfo.overview}</p>
            </div>

            <div className="is-overview-grid">
              {eventInfo.overviewDetails.map((item) => (
                <div key={item.label} className="is-overview-detail-card">
                  <div className="is-overview-detail-label">{item.label}</div>
                  <div className="is-overview-detail-value">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="is-overview-card">
              <h3 className="is-card-title">
                <span>🚀</span>
                <span>ITRC 사업 소개</span>
              </h3>
              <div className="is-initiative-grid">
                {eventInfo.initiatives.map((initiative) => (
                  <div key={initiative.title} className="is-initiative-card">
                    <div className="is-initiative-body">
                      <div className="is-initiative-title">{initiative.title}</div>
                      <p className="is-initiative-desc">{initiative.desc}</p>
                    </div>
                    <div className="is-initiative-stats">
                      {initiative.stats.map((stat) => (
                        <span key={stat} className="is-initiative-stat">{stat}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="is-overview-card">
              <h3 className="is-card-title">
                <span>🏷️</span>
                <span>주최 / 주관</span>
              </h3>
              <div className="is-organizer-list">
                {eventInfo.organizers.map((item) => (
                  <div key={item.label} className="is-organizer-item">
                    <span className="is-organizer-label">{item.label}</span>
                    <span className="is-organizer-value">{item.value}</span>
                  </div>
                ))}
              </div>
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
                    <div className="is-prog-venue">
                      <span>📍</span>
                      <span>{prog.venue}</span>
                    </div>
                    <div className="is-prog-highlights">
                      {prog.highlights.map((item) => (
                        <div key={item} className="is-prog-highlight">
                          <span className="is-prog-bullet" aria-hidden="true" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    {prog.participants?.length ? (
                      <div className="is-prog-participants">
                        <div className="is-prog-participants-title">참석 대상</div>
                        <div className="is-prog-participant-list">
                          {prog.participants.map((item) => (
                            <span key={item} className="is-prog-participant-badge">{item}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
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

        {activeTab === 'videos' && (
          <div className="is-tab-content is-tab-content-video fade-in">
            <div className="is-video-card">
              <div className="is-video-copy">
                <div className="is-video-copy-text">
                  <h2 className="is-video-title">{LAST_EVENT_VIDEO.title}</h2>
                  <p className="is-video-desc">{LAST_EVENT_VIDEO.description}</p>
                </div>
                <a
                  className="is-video-link"
                  href={LAST_EVENT_VIDEO.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  유튜브에서 보기
                </a>
              </div>

              <div className="is-video-frame-wrap">
                <iframe
                  className="is-video-frame"
                  src={LAST_EVENT_VIDEO.embedUrl}
                  title={LAST_EVENT_VIDEO.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
