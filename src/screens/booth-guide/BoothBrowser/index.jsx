import { useEffect, useState } from 'react';
import { booths, categories, getBoothsByCategory } from '../../../data/booths';
import backIcon from '../../../assets/icons/back.svg';
import './styles.css';

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

export default function BoothBrowser({ navigate, goHome, embedded = false, data = null }) {
  const [activeCategory, setActiveCategory] = useState(data?.activeCategory ?? null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  const displayBooths = (activeCategory
    ? getBoothsByCategory(activeCategory)
    : booths
  ).slice().sort((a, b) => a.id.localeCompare(b.id, 'ko'));

  const activeCat = categories.find((category) => category.id === activeCategory);

  useEffect(() => {
    setActiveCategory(data?.activeCategory ?? null);
  }, [data?.activeCategory]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(formatDateTime(new Date()));
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={`booth-browser ${embedded ? 'booth-browser-embedded' : 'screen-enter'}`}>
      {!embedded && (
        <header className="bb-header">
          <div className="bb-brand">
            <div className="bb-brand-mark">ITRC</div>
          </div>

          <div className="bb-header-right">
            <div className="bb-header-datetime">{currentDateTime}</div>
            <div className="bb-header-page">부스 안내</div>
          </div>
        </header>
      )}

      <div className="bb-breadcrumb-shell">
        {!activeCategory ? (
          <div className="bb-breadcrumb-bar">
            <span className="bb-breadcrumb-back-spacer" aria-hidden="true" />
            <div className="bb-breadcrumb-trail">
              <span>부스 안내</span>
              <span className="bb-breadcrumb-sep">›</span>
              <span className="bb-breadcrumb-current">카테고리 선택</span>
            </div>
          </div>
        ) : (
          <div className="bb-breadcrumb-bar">
            <button
              className="bb-breadcrumb-back"
              onClick={() => setActiveCategory(null)}
              aria-label="뒤로 가기"
            >
              <img src={backIcon} alt="" />
            </button>
            <div className="bb-breadcrumb-trail">
              <span>부스 안내</span>
              <span className="bb-breadcrumb-sep">›</span>
              <span>카테고리 선택</span>
              <span className="bb-breadcrumb-sep">›</span>
              <span className="bb-breadcrumb-current">{activeCat?.label}</span>
            </div>
          </div>
        )}
      </div>

      {!activeCategory ? (
        <main className="bb-main">
          <div className="bb-main-head">
            <p className="bb-main-subtitle">원하는 분야를 선택해 부스를 확인하세요</p>
          </div>

          <div className="bb-category-grid scrollable">
            {categories.map(cat => {
              const count = getBoothsByCategory(cat.id).length;

              return (
                <button
                  key={cat.id}
                  className="bb-cat-card"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div className="bb-cat-card-icon">{cat.icon}</div>
                  <div className="bb-cat-card-text">
                    <span className="bb-cat-card-name">{cat.label}</span>
                    <span className="bb-cat-card-count">{count}개 부스</span>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        <main className="bb-main">
          <div className="bb-main-head bb-main-head-list">
            <h1 className="bb-main-title">{activeCat?.label}</h1>
            <p className="bb-main-subtitle">{displayBooths.length}개 연구센터를 선택할 수 있습니다</p>
          </div>

          <div className="bb-booth-list scrollable">
            {displayBooths.map(booth => (
              <button
                key={booth.id}
                className="bb-booth-list-item"
                onClick={() => navigate('booth-detail', {
                  booth,
                  categoryId: activeCategory,
                  source: 'booth-browser',
                })}
              >
                <div className="bb-booth-list-head">
                  <div className="bb-booth-location">전시장 {booth.section} 구역</div>
                </div>

                <div className="bb-booth-info">
                  <span className="bb-booth-name">{booth.name}</span>
                  <span className="bb-booth-univ">{booth.univ}</span>
                </div>
                <span className="bb-booth-list-arrow">→</span>
              </button>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
