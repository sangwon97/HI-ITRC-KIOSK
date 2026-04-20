import { useEffect, useMemo, useState } from 'react';
import { booths, CATEGORY_MAP, SORTED_BOOTHS } from '../../../data/booths';
import { appendHangulInput, removeLastHangulInput } from '../../../utils/hangulInput';
import {
  NUMBER_ROW,
  KOREAN_ROWS,
  ENGLISH_ROWS,
  QUICK_KEYWORDS,
  QUICK_UNIVERSITIES,
} from '../../../data/keyboard';
import searchIcon from '../../../assets/icons/keyboard_keys.svg';
import { getCategoryPresentation } from '../../../utils/categoryPresentation';
import useBoothSearch from '../../../hooks/useBoothSearch';
import './styles.css';

const POPULAR_BOOTH_STORAGE_KEY = 'itrc-map-popular-booths';
const POPULAR_BOOTH_LIMIT = 5;

function loadPopularBooths() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(POPULAR_BOOTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return booths
      .map((booth) => ({
        booth,
        count: Number(parsed?.[booth.id] ?? 0),
      }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.booth.id.localeCompare(b.booth.id, 'ko');
      })
      .slice(0, POPULAR_BOOTH_LIMIT);
  } catch {
    return [];
  }
}

export default function MapSearchOverlay({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [inputMode, setInputMode] = useState('ko');
  const [showAllBooths, setShowAllBooths] = useState(false);
  const [popularBooths, setPopularBooths] = useState([]);
  const { hasSearched, results: searchedBooths } = useBoothSearch(query);

  useEffect(() => {
    setPopularBooths(loadPopularBooths());
  }, []);

  const allBooths = useMemo(() => SORTED_BOOTHS, []);
  const results = showAllBooths ? allBooths : searchedBooths;
  const activeLetterRows = inputMode === 'ko' ? KOREAN_ROWS : ENGLISH_ROWS;
  const isShowingResults = showAllBooths || hasSearched;

  const beginSearch = (nextValue) => {
    setShowAllBooths(false);
    setQuery(nextValue);
  };

  const appendText = (text) => {
    setShowAllBooths(false);
    setQuery((q) => inputMode === 'ko' ? appendHangulInput(q, text) : q + text);
  };

  const backspace = () => {
    setShowAllBooths(false);
    setQuery((q) => removeLastHangulInput(q));
  };
  const clear = () => beginSearch('');
  const toggleMode = () => setInputMode((m) => m === 'ko' ? 'en' : 'ko');
  const openAllBooths = () => {
    setQuery('');
    setShowAllBooths(true);
  };

  const selectBooth = (booth) => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(POPULAR_BOOTH_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const next = {
          ...parsed,
          [booth.id]: Number(parsed?.[booth.id] ?? 0) + 1,
        };

        window.localStorage.setItem(POPULAR_BOOTH_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage 사용이 불가한 환경에서도 선택 동작은 유지
      }
    }

    setPopularBooths(loadPopularBooths());
    onSelect(booth);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="mso-overlay" onClick={handleBackdropClick}>
      <div className="mso-panel">
        {/* 헤더 */}
        <div className="mso-header">
          <div className={`mso-input-wrap ${query ? 'mso-input-filled' : ''}`}>
            <span className={`mso-input-text ${query ? '' : 'mso-input-placeholder'}`}>
              {query || '센터명 또는 대학명으로 검색'}
            </span>
            {query && (
              <button className="mso-input-clear" onClick={clear}>✕</button>
            )}
          </div>
          <button className="mso-close-btn" onClick={onClose}>닫기</button>
        </div>

        {/* 본문 */}
        <div className="mso-body">
          {/* 결과 */}
          <div className="mso-results">
            <div className="mso-results-action">
              <button
                className={`mso-all-booths-btn ${showAllBooths ? 'mso-all-booths-btn-active' : ''}`}
                onClick={openAllBooths}
              >
                전체 부스 보기
              </button>
            </div>

            {!isShowingResults ? (
              <div className="mso-empty">
                <p>센터명 또는 대학명으로<br />부스를 검색하면 3D 지도에서<br />길찾기로 안내합니다.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="mso-empty">
                <p>"{query}"에 대한<br />검색 결과가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="mso-result-count">
                  <span className="mso-result-num">{results.length}개</span> {showAllBooths ? '전체 부스' : '검색 결과'}
                </div>
                <div className="mso-result-list scrollable">
                  {results.map(b => {
                    const category = CATEGORY_MAP.get(b.category);
                    const categoryPresentation = getCategoryPresentation(category?.color);
                    return (
                      <button
                        key={b.id}
                        className="mso-result-item"
                        onClick={() => selectBooth(b)}
                      >
                        <div
                          className="mso-result-cat"
                          style={{
                            background: categoryPresentation.solidBackground,
                            color: categoryPresentation.textColor,
                            borderColor: categoryPresentation.borderColor,
                          }}
                        >
                          {category?.icon} {category?.label}
                        </div>
                        <div className="mso-result-info">
                          <span className="mso-result-name">{b.name}</span>
                          <span className="mso-result-univ">{b.univ}</span>
                        </div>
                        <span className="mso-result-arrow">→</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 키보드 */}
          <div className="mso-keyboard">
            <div className="mso-sk-top">
              <div className="mso-feature-section">
                <div className="mso-sk-section-label">인기 부스</div>
                {popularBooths.length > 0 ? (
                  <div className="mso-popular-list">
                    {popularBooths.map(({ booth, count }, index) => (
                      <button
                        key={booth.id}
                        className="mso-popular-item"
                        onClick={() => selectBooth(booth)}
                      >
                        <span className="mso-popular-rank">{index + 1}</span>
                        <span className="mso-popular-text">
                          <span className="mso-popular-name">{booth.name}</span>
                          <span className="mso-popular-univ">{booth.univ}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mso-popular-empty">
                    선택된 부스 기록이 쌓이면 여기에 인기 부스가 표시됩니다.
                  </div>
                )}
              </div>

              <div className="mso-sk-section">
                <div className="mso-sk-section-label">빠른 입력</div>
                <div className="mso-sk-quick-btns">
                  {QUICK_KEYWORDS.map(kw => (
                    <button
                      key={kw}
                      className={`mso-sk-quick-btn ${query === kw ? 'mso-sk-quick-active' : ''}`}
                      onClick={() => beginSearch(kw)}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mso-sk-section">
                <div className="mso-sk-section-label">대학명 빠른 입력</div>
                <div className="mso-sk-quick-btns">
                  {QUICK_UNIVERSITIES.map(key => (
                    <button key={key} className="mso-sk-quick-btn" onClick={() => beginSearch(key)}>{key}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mso-sk-layout">
              <div className="mso-sk-row">
                {NUMBER_ROW.map((key) => (
                  <button key={key} className="mso-sk-key" onClick={() => appendText(key)}>{key}</button>
                ))}
              </div>
              <div className="mso-sk-row">
                {activeLetterRows[0].map((key) => (
                  <button key={key} className="mso-sk-key" onClick={() => appendText(key)}>{key}</button>
                ))}
              </div>
              <div className="mso-sk-row mso-sk-row-middle">
                {activeLetterRows[1].map((key) => (
                  <button key={key} className="mso-sk-key" onClick={() => appendText(key)}>{key}</button>
                ))}
              </div>
              <div className="mso-sk-row mso-sk-row-bottom">
                <button
                  className={`mso-sk-key mso-sk-key-mode ${inputMode === 'en' ? 'mso-sk-key-mode-active' : ''}`}
                  onClick={toggleMode}
                >
                  한/영
                </button>
                {activeLetterRows[2].map((key) => (
                  <button key={key} className="mso-sk-key" onClick={() => appendText(key)}>{key}</button>
                ))}
                <button className="mso-sk-key mso-sk-key-backspace" onClick={backspace} aria-label="지우기">
                  <span className="mso-sk-backspace-icon" aria-hidden="true" />
                </button>
                <button className="mso-sk-key mso-sk-key-clear" onClick={clear}>초기화</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
