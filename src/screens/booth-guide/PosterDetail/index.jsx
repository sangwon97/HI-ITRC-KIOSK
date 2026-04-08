import { categories } from '../../../data/booths';
import backIcon from '../../../assets/icons/back.svg';
import knowledgeSciencePosterImage from '../../../assets/temp_S1B1P1.webp';
import './styles.css';

export default function PosterDetail({ data, goBack, goHome, embedded = false }) {
  if (!data) return null;
  const { poster, booth, categoryId } = data;
  const category = categories.find((item) => item.id === (categoryId ?? booth?.category));
  const posterImageSrc = poster?.id === 'S1B1P1' ? knowledgeSciencePosterImage : poster.image;

  return (
    <div className={`poster-detail ${embedded ? 'poster-detail-embedded' : 'screen-enter'}`}>
      {!embedded && (
        <header className="screen-header pd-header">
          <button className="btn-back" onClick={goBack}>이전</button>
          <div className="pd-header-title">연구 포스터</div>
          <button className="btn-back" onClick={goHome}>홈</button>
        </header>
      )}

      {embedded && (
        <div className="pd-breadcrumb-shell">
          <div className="pd-breadcrumb-bar">
            <button className="pd-breadcrumb-back" onClick={goBack} aria-label="뒤로 가기">
              <img src={backIcon} alt="" />
            </button>
            <div className="pd-breadcrumb-trail">
              <span>부스 안내</span>
              <span className="pd-breadcrumb-sep">›</span>
              <span>카테고리 선택</span>
              <span className="pd-breadcrumb-sep">›</span>
              <span>{category?.label}</span>
              <span className="pd-breadcrumb-sep">›</span>
              <span>{booth?.name || '연구센터'}</span>
              <span className="pd-breadcrumb-sep">›</span>
              <span className="pd-breadcrumb-current">연구 포스터</span>
            </div>
          </div>
        </div>
      )}

      <div className="pd-viewport">
        <div className="pd-content">
        {/* 포스터 이미지 영역 */}
        <div className="pd-image-area">
          <div className="pd-image-wrap">
            <img
              src={posterImageSrc}
              alt={poster.title}
              className="pd-image"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div className="pd-image-fallback" style={{ display: 'none' }}>
              <span>🖼️</span>
              <span>이미지를 불러올 수 없습니다</span>
            </div>
          </div>
        </div>

        {/* 포스터 정보 */}
        <div className="pd-info scrollable">
          {/* 출처 */}
          <div className="pd-source">
            <span className="pd-source-booth">{booth?.name || ''}</span>
          </div>

          {/* 제목 */}
          <h1 className="pd-title">{poster.title}</h1>

          {/* 대학명 */}
          {booth?.univ && (
            <div className="pd-univ">
              <span>🎓</span>
              <span>{booth.univ}</span>
            </div>
          )}

          <div className="pd-divider" />

          {/* 설명 */}
          <div className="pd-description-label">연구 개요</div>
          <p className="pd-description">{poster.description}</p>
        </div>
        </div>
      </div>
    </div>
  );
}
