import './PosterDetail.css';

export default function PosterDetail({ data, goBack, goHome }) {
  if (!data) return null;
  const { poster, booth } = data;

  return (
    <div className="poster-detail screen-enter">
      {/* 헤더 */}
      <header className="screen-header pd-header">
        <button className="btn-back" onClick={goBack}>이전</button>
        <div className="pd-header-title">연구 포스터</div>
        <button className="btn-back" onClick={goHome}>홈</button>
      </header>

      <div className="pd-content">
        {/* 포스터 이미지 영역 */}
        <div className="pd-image-area">
          <div className="pd-image-wrap">
            <img
              src={poster.image}
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
            <span className="pd-source-id">{poster.id}</span>
            <span className="pd-source-sep">·</span>
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
  );
}
