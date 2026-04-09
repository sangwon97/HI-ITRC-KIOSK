import { eventInfo } from '../../../data/eventInfo';
import './styles.css';

const MENU_ITEMS = [
  {
    id: 'booth-browser',
    icon: '🏛️',
    title: '부스 안내',
    desc: '분야별 부스를 카드로 탐색',
    accent: '#79a8ca',
    gradient: 'linear-gradient(135deg, #5c8fb8, #2e6f9f)',
  },
  {
    id: 'search',
    icon: '🔍',
    title: '부스 검색',
    desc: '연구센터 · 대학명으로 검색',
    accent: '#79a8ca',
    gradient: 'linear-gradient(135deg, #5c8fb8, #2e6f9f)',
  },
  {
    id: 'map',
    icon: '🗺️',
    title: '전시 지도',
    desc: '전시장 구역 안내',
    accent: '#79a8ca',
    gradient: 'linear-gradient(135deg, #5c8fb8, #2e6f9f)',
  },
  {
    id: 'info',
    icon: '📋',
    title: '행사 안내',
    desc: '일정 · 프로그램 · 이용 안내',
    accent: '#79a8ca',
    gradient: 'linear-gradient(135deg, #5c8fb8, #2e6f9f)',
  },
];

export default function HomeScreen({ navigate }) {
  return (
    <div className="home-screen screen-enter">
      {/* 배경 */}
      <div className="home-bg">
        <div className="home-orb home-orb-1" />
        <div className="home-orb home-orb-2" />
      </div>

      {/* 헤더 */}
      <header className="home-header">
        <div className="home-brand">
          <span className="home-brand-itrc">ITRC 2026</span>
          <span className="home-brand-sep">|</span>
          <span className="home-brand-sub">인재양성대전</span>
        </div>
        <div className="home-event-badge">
          <span>📅</span>
          <span>{eventInfo.date}</span>
          <span className="home-badge-dot">·</span>
          <span>📍 {eventInfo.venue}</span>
        </div>
      </header>

      {/* 히어로 */}
      <div className="home-hero">
        <div className="home-hero-tag">환영합니다</div>
        <h1 className="home-hero-title">
          <span className="gradient-text">AI 대전환 시대,</span>
          <br />
          <span>기술주권을 이끄는 미래인재</span>
        </h1>
        <p className="home-hero-desc">
          무엇을 찾고 계신가요?
        </p>
      </div>

      {/* 메인 메뉴 */}
      <nav className="home-menu">
        {MENU_ITEMS.map(item => (
          <button
            key={item.id}
            className="home-menu-card"
            onClick={() => navigate(item.id)}
            style={{ '--card-accent': item.accent }}
          >
            <div className="home-menu-icon-wrap" style={{ background: item.gradient }}>
              <span className="home-menu-icon">{item.icon}</span>
            </div>
            <div className="home-menu-text">
              <span className="home-menu-title">{item.title}</span>
              <span className="home-menu-desc">{item.desc}</span>
            </div>
            <span className="home-menu-arrow">→</span>
          </button>
        ))}
      </nav>

      {/* 통계 바 */}
      <div className="home-stats-bar">
        {eventInfo.stats.map((s, i) => (
          <div key={i} className="home-stat-item">
            <span className="home-stat-value gradient-text">{s.value}</span>
            <span className="home-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
