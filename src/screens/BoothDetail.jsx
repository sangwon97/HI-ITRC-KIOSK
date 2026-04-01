import { postersByBooth } from '../data/posters';
import { centerData } from '../data/centerInfo';
import { categories } from '../data/booths';
import './BoothDetail.css';

export default function BoothDetail({ data: booth, navigate, goBack, goHome }) {
  if (!booth) return null;

  const posters = postersByBooth[booth.id] || [];
  const center = centerData[booth.id];
  const cat = categories.find(c => c.id === booth.category);

  return (
    <div className="booth-detail screen-enter">
      {/* 헤더 */}
      <header className="screen-header bd-header">
        <button className="btn-back" onClick={goBack}>이전</button>
        <div className="bd-header-center">
          <div className="bd-header-id">{booth.id}</div>
        </div>
        <button className="btn-back" onClick={goHome}>홈</button>
      </header>

      <div className="bd-content scrollable">
        {/* 부스 정보 히어로 */}
        <div className="bd-hero" style={{ '--cat-color': cat?.color || 'var(--accent)' }}>
          <div className="bd-hero-cat">
            <span>{cat?.icon}</span>
            <span>{cat?.label}</span>
          </div>
          <h1 className="bd-hero-name">{booth.name}</h1>
          <div className="bd-hero-univ">
            <span className="bd-univ-icon">🎓</span>
            <span>{booth.univ}</span>
          </div>
        </div>

        {/* 포스터 섹션 */}
        {posters.length > 0 && (
          <section className="bd-section">
            <h2 className="bd-section-title">
              <span>📌</span>
              <span>연구 포스터</span>
              <span className="bd-section-count">{posters.length}개</span>
            </h2>
            <div className="bd-posters">
              {posters.map((poster, i) => (
                <button
                  key={poster.id}
                  className="bd-poster-card"
                  onClick={() => navigate('poster', { poster, booth })}
                >
                  <div className="bd-poster-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="bd-poster-info">
                    <span className="bd-poster-title">{poster.title}</span>
                    <span className="bd-poster-preview">
                      {poster.description.slice(0, 50)}...
                    </span>
                  </div>
                  <span className="bd-poster-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 연구센터 소개 섹션 */}
        {center && (
          <section className="bd-section">
            <h2 className="bd-section-title">
              <span>🏫</span>
              <span>연구센터 소개</span>
            </h2>
            <div className="bd-center-intro">
              <p className="bd-center-text">{center.intro}</p>
              <button
                className="bd-center-btn"
                onClick={() => navigate('center', { center, booth })}
              >
                <span>자세히 보기</span>
                <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* 포스터 없는 경우 안내 */}
        {posters.length === 0 && !center && (
          <div className="bd-empty">
            <span>📭</span>
            <p>이 부스의 상세 정보를 준비 중입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
