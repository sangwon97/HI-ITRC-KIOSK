import { useEffect, useMemo, useState } from 'react';
import { eventInfo } from '../../../data/eventInfo';
import luckyDrawImage from '../../../assets/174124_71433250.png';
import stickerPhotoImage from '../../../assets/1767_71433250.png';
import sponsorsImage from '../../../assets/program-partners/program-sponsors.png';
import academiesImage from '../../../assets/program-partners/program-academies.png';
import ExhibitionZoneMap from '../ExhibitionZoneMap';
import './styles.css';

const TABS = [
  { id: 'overview', label: '행사 개요' },
  { id: 'programs', label: '프로그램' },
  { id: 'zones', label: '전시 구역'},
];

export default function InfoScreen({ goBack, goHome, navigate, embedded = false, data = null }) {
  const initialTab = TABS.some((tab) => tab.id === data?.tab) ? data.tab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [supportSlideIndex, setSupportSlideIndex] = useState(0);

  useEffect(() => {
    setActiveTab(TABS.some((tab) => tab.id === data?.tab) ? data.tab : 'overview');
  }, [data?.tab]);

  useEffect(() => {
    if (activeTab !== 'programs') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSupportSlideIndex((current) => (current + 1) % 2);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [activeTab]);

  const mainExhibitionProgram = useMemo(
    () => eventInfo.programs.find((program) => program.id === 'main-exhibition') ?? null,
    [],
  );
  const networkingProgram = useMemo(
    () => eventInfo.programs.find((program) => program.id === 'networking') ?? null,
    [],
  );
  const cultureProgram = useMemo(
    () => eventInfo.programs.find((program) => program.id === 'culture-event') ?? null,
    [],
  );

  const cultureSectionVisuals = {
    '럭키드로우': luckyDrawImage,
    '스티커 사진': stickerPhotoImage,
  };

  const supportSlides = useMemo(() => ([
    { id: 'sponsors', title: '후원 업체', image: sponsorsImage, alt: '후원 업체 목록' },
    { id: 'academies', title: '후원 학회', image: academiesImage, alt: '후원 학회 목록' },
  ]), []);

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
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div
        className={`is-content ${activeTab === 'zones' ? 'is-content-zones' : ''} ${activeTab === 'programs' ? 'is-content-programs' : ''}`}
        key={activeTab}
      >
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
          <div className="is-tab-content is-tab-content-programs fade-in">
            <div className="is-program-showcase">
              <section className="is-program-board is-program-board-main">
                <div className="is-program-board-hero">
                  <div className="is-program-board-title">ITRC 인재양성대전 2026</div>
                  <div className="is-program-board-decoration" aria-hidden="true">🧠</div>
                </div>

                <div className="is-program-board-frame">
                  <div className="is-program-board-bar">주요행사</div>
                  <div className="is-program-board-scroll">
                    {mainExhibitionProgram ? (
                      <section className="is-program-topic">
                        <h3 className="is-program-topic-heading">행사일정</h3>
                        <div className="is-program-topic-list">
                          <div className="is-program-topic-row">
                            <span className="is-program-topic-key">행 사 명</span>
                            <span className="is-program-topic-value">
                              "{eventInfo.subtitle}! {eventInfo.title}"
                            </span>
                          </div>
                          <div className="is-program-topic-row">
                            <span className="is-program-topic-key">일시/장소</span>
                            <span className="is-program-topic-value">
                              {mainExhibitionProgram.time} / {mainExhibitionProgram.venue}
                            </span>
                          </div>
                          <div className="is-program-topic-row">
                            <span className="is-program-topic-key">주요내용</span>
                            <span className="is-program-topic-value">{mainExhibitionProgram.desc}</span>
                          </div>
                        </div>
                      </section>
                    ) : null}

                    <section className="is-program-topic">
                      {networkingProgram ? (
                        <div className="is-program-event-block">
                          <div className="is-program-event-title">간담회</div>
                          <div className="is-program-topic-list">
                            <div className="is-program-topic-row">
                              <span className="is-program-topic-key">일시/장소</span>
                              <span className="is-program-topic-value">
                                {networkingProgram.time} / {networkingProgram.venue}
                              </span>
                            </div>
                            <div className="is-program-topic-row">
                              <span className="is-program-topic-key">주요내용</span>
                              <span className="is-program-topic-value">{networkingProgram.desc}</span>
                            </div>
                            {networkingProgram.participants?.length ? (
                              <div className="is-program-topic-row">
                                <span className="is-program-topic-key">참석대상</span>
                                <span className="is-program-topic-value">
                                  {networkingProgram.participants.join(', ')}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {cultureProgram ? (
                        <div className="is-program-event-block">
                          <div className="is-program-event-title">문화행사</div>
                          <div className="is-program-topic-list">
                            <div className="is-program-topic-row">
                              <span className="is-program-topic-key">일시/장소</span>
                              <span className="is-program-topic-value">
                                {cultureProgram.time} / {cultureProgram.venue}
                              </span>
                            </div>
                            <div className="is-program-topic-row">
                              <span className="is-program-topic-key">주요내용</span>
                              <span className="is-program-topic-value">
                                <span className="is-program-chip-row">
                                  {cultureProgram.highlights.map((item) => (
                                    <span key={item} className="is-program-event-chip">{item}</span>
                                  ))}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="is-program-topic is-program-support-topic">
                      <div className="is-program-support-head">
                        <h3 className="is-program-topic-heading">{supportSlides[supportSlideIndex].title}</h3>
                        <div className="is-program-support-indicators" aria-hidden="true">
                          {supportSlides.map((slide, index) => (
                            <span
                              key={slide.id}
                              className={`is-program-support-indicator ${supportSlideIndex === index ? 'is-program-support-indicator-active' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="is-program-support-slider">
                        <div
                          className="is-program-support-track"
                          style={{ transform: `translateX(-${supportSlideIndex * 100}%)` }}
                        >
                          {supportSlides.map((slide) => (
                            <div key={slide.id} className="is-program-support-slide">
                              <div className="is-program-support-card">
                                <img
                                  src={slide.image}
                                  alt={slide.alt}
                                  className="is-program-support-image"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </section>

              {cultureProgram ? (
                <section className="is-program-board is-program-board-culture">
                  <div className="is-program-board-hero">
                    <div className="is-program-board-title">문화행사</div>
                    <div className="is-program-board-decoration" aria-hidden="true">🎁</div>
                  </div>

                  <div className="is-program-board-frame">
                    <div className="is-program-board-pill">{cultureProgram.time}</div>
                    <div className="is-program-board-scroll">
                      <div className="is-culture-list">
                        {cultureProgram.sections.map((section) => {
                          const sectionVisual = cultureSectionVisuals[section.title];

                          return (
                            <section key={section.title} className="is-culture-item">
                              <div className="is-culture-copy">
                                <h3 className="is-culture-title">{section.title}</h3>
                                <p className="is-culture-desc">{section.description}</p>
                                {section.items?.length ? (
                                  <div className="is-culture-points">
                                    {section.items.map((item) => {
                                      const [label, ...rest] = item.split(':');
                                      const hasLabel = rest.length > 0;

                                      return (
                                        <div key={item} className="is-culture-point">
                                          <span className="is-culture-point-dot" aria-hidden="true" />
                                          <span className="is-culture-point-copy">
                                            {hasLabel ? (
                                              <>
                                                <strong>{label}:</strong> {rest.join(':').trim()}
                                              </>
                                            ) : (
                                              item
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>

                              {sectionVisual ? (
                                <div className="is-culture-visual" aria-hidden="true">
                                  <img src={sectionVisual} alt="" className="is-culture-image" />
                                </div>
                              ) : null}
                            </section>
                          );
                        })}
                      </div>

                      {cultureProgram.note ? (
                        <div className="is-culture-note">{cultureProgram.note}</div>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="is-tab-content is-tab-content-zones fade-in">
            <ExhibitionZoneMap />
          </div>
        )}

      </div>
    </div>
  );
}
