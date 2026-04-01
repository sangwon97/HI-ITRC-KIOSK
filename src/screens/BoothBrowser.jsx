import { useState } from 'react';
import { booths, categories, getBoothsByCategory } from '../data/booths';
import './BoothBrowser.css';

export default function BoothBrowser({ navigate, goHome }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const displayBooths = activeCategory
    ? getBoothsByCategory(activeCategory)
    : booths;

  const activeCat = categories.find(c => c.id === activeCategory);

  return (
    <div className="booth-browser screen-enter">
      {/* 헤더 */}
      <header className="screen-header bb-header">
        <div style={{ width: 80 }} />
        <div>
          <div className="title">전시 부스</div>
          <div className="subtitle">
            {activeCategory ? `${activeCat?.label} · ${displayBooths.length}개` : `전체 ${booths.length}개 부스`}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-back" onClick={goHome}>홈</button>
        </div>
      </header>

      {/* 카테고리 필터 */}
      <div className="bb-categories scrollable">
        <button
          className={`bb-cat-chip ${!activeCategory ? 'bb-cat-active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          전체
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`bb-cat-chip ${activeCategory === cat.id ? 'bb-cat-active' : ''}`}
            style={activeCategory === cat.id ? { '--cat-color': cat.color } : {}}
            onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 카테고리 뷰 or 부스 리스트 */}
      {!activeCategory ? (
        <div className="bb-category-grid scrollable">
          {categories.map(cat => {
            const count = getBoothsByCategory(cat.id).length;
            return (
              <button
                key={cat.id}
                className="bb-cat-card"
                style={{ '--cat-color': cat.color }}
                onClick={() => setActiveCategory(cat.id)}
              >
                <div className="bb-cat-card-icon">{cat.icon}</div>
                <div className="bb-cat-card-text">
                  <span className="bb-cat-card-name">{cat.label}</span>
                  <span className="bb-cat-card-count">{count}개 부스</span>
                </div>
                <div className="bb-cat-card-arrow">→</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bb-booth-list scrollable">
          {displayBooths.map(booth => (
            <button
              key={booth.id}
              className="bb-booth-item"
              onClick={() => navigate('booth-detail', booth)}
            >
              <div className="bb-booth-id">{booth.id}</div>
              <div className="bb-booth-info">
                <span className="bb-booth-name">{booth.name}</span>
                <span className="bb-booth-univ">{booth.univ}</span>
              </div>
              <span className="bb-booth-arrow">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
