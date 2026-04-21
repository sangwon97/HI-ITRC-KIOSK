import { useEffect, useState } from 'react';
import { loadBoothPosters } from '../../../data/posters';
import { loadBoothCenter } from '../../../data/centerInfo';
import { categories } from '../../../data/booths';
import backIcon from '../../../assets/icons/back.svg';
import { getCategoryPresentation } from '../../../utils/categoryPresentation';
import './styles.css';

export default function BoothDetail({ data, navigate, goBack, goHome, embedded = false }) {
  const boothPayload = data?.booth
    ? data
    : data
      ? { booth: data, categoryId: data.category ?? null, source: null }
      : null;
  const booth = boothPayload?.booth;
  const [posters, setPosters] = useState(null);
  const [center, setCenter] = useState(undefined);
  const resolvedPosters = posters ?? [];

  useEffect(() => {
    if (!booth?.id) {
      setPosters([]);
      return undefined;
    }

    let isCancelled = false;

    setPosters(null);
    loadBoothPosters(booth.id)
      .then((items) => {
        if (!isCancelled) {
          setPosters(items);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPosters([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [booth?.id]);

  useEffect(() => {
    if (!booth?.id) {
      setCenter(null);
      return undefined;
    }

    let isCancelled = false;

    setCenter(undefined);
    loadBoothCenter(booth.id)
      .then((item) => {
        if (!isCancelled) {
          setCenter(item);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCenter(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [booth?.id]);

  if (!booth) return null;
  const cat = categories.find(c => c.id === booth.category);
  const categoryPresentation = getCategoryPresentation(cat?.color);
  const isSingleSpecialPoster = booth.category === 'special_exhibition' && resolvedPosters.length === 1;
  const singleSpecialPoster = isSingleSpecialPoster ? resolvedPosters[0] : null;

  return (
    <div className={`booth-detail ${embedded ? 'booth-detail-embedded' : 'screen-enter'}`}>
      {!embedded && (
        <header className="screen-header bd-header">
          <button className="btn-back" onClick={goBack}>이전</button>
          <div className="bd-header-center" />
          <button className="btn-back" onClick={goHome}>홈</button>
        </header>
      )}

      {embedded && (
        <div className="bd-breadcrumb-shell">
          <div className="bd-breadcrumb-bar">
            <button className="bd-breadcrumb-back" onClick={goBack} aria-label="뒤로 가기">
              <img src={backIcon} alt="" />
            </button>
            <div className="bd-breadcrumb-trail">
              <span>부스 안내</span>
              <span className="bd-breadcrumb-sep">›</span>
              <span>카테고리 선택</span>
              <span className="bd-breadcrumb-sep">›</span>
              <span>{cat?.label}</span>
              <span className="bd-breadcrumb-sep">›</span>
              <span className="bd-breadcrumb-current">{booth.name}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bd-viewport">
        <div className="bd-content">
        {/* 부스 정보 히어로 */}
        <div
          className="bd-hero"
          style={{
            '--cat-color': cat?.color || 'var(--accent)',
            '--cat-accent-color': categoryPresentation.textColor,
            '--cat-border-color': categoryPresentation.borderColor,
            '--cat-bg-color': categoryPresentation.subtleBackground,
          }}
        >
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

        <div className="bd-sections scrollable">
          {/* 포스터 섹션 */}
          {resolvedPosters.length > 0 && !isSingleSpecialPoster && (
            <section className="bd-section">
              <h2 className="bd-section-title">
                <span>📌</span>
                <span>연구 포스터</span>
                <span className="bd-section-count">{resolvedPosters.length}개</span>
              </h2>
              <div className="bd-posters">
                {resolvedPosters.map((poster, i) => (
                  <button
                    key={poster.id}
                    className="bd-poster-card"
                    onClick={() => navigate('poster', {
                      poster,
                      booth,
                      categoryId: boothPayload?.categoryId ?? booth.category,
                      source: boothPayload?.source ?? 'booth-browser',
                    })}
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

          {singleSpecialPoster && (
            <section className="bd-section">
              <h2 className="bd-section-title">
                <span>📌</span>
                <span>연구 포스터</span>
              </h2>
              <div className="bd-single-poster">
                <div className="bd-single-poster-title">{singleSpecialPoster.title}</div>
                <div className="bd-single-poster-image-shell">
                  <img
                    src={singleSpecialPoster.image}
                    alt={singleSpecialPoster.title}
                    className="bd-single-poster-image"
                  />
                </div>
                <p className="bd-single-poster-description">{singleSpecialPoster.description}</p>
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
                  onClick={() => navigate('center', {
                    center,
                    booth,
                    categoryId: boothPayload?.categoryId ?? booth.category,
                    source: boothPayload?.source ?? 'booth-browser',
                  })}
                >
                  <span>자세히 보기</span>
                  <span>→</span>
                </button>
              </div>
            </section>
          )}

          {/* 포스터 없는 경우 안내 */}
          {posters !== null && center !== undefined && resolvedPosters.length === 0 && !center && (
            <div className="bd-empty">
              <span>📭</span>
              <p>이 부스의 상세 정보를 준비 중입니다.</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
