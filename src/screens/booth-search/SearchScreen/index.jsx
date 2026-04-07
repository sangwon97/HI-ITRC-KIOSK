import { useState, useEffect } from 'react';
import { searchBooths, categories } from '../../../data/booths';
import { appendHangulInput, removeLastHangulInput } from '../../../utils/hangulInput';
import { getCategoryPresentation } from '../../../utils/categoryPresentation';
import {
  NUMBER_ROW,
  KOREAN_ROWS,
  ENGLISH_ROWS,
  QUICK_KEYWORDS,
  QUICK_UNIVERSITIES,
} from '../../../data/keyboard';
import './styles.css';

export default function SearchScreen({ navigate, goBack, goHome, embedded = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [inputMode, setInputMode] = useState('ko');

  useEffect(() => {
    if (query.trim().length >= 1) {
      const found = searchBooths(query.trim());
      setResults(found);
      setHasSearched(true);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [query]);

  const appendText = (text) => {
    setQuery((currentQuery) => {
      if (inputMode === 'ko') {
        return appendHangulInput(currentQuery, text);
      }

      return currentQuery + text;
    });
  };

  const clearText = () => {
    setQuery('');
  };

  const backspace = () => {
    setQuery((currentQuery) => removeLastHangulInput(currentQuery));
  };

  const toggleInputMode = () => {
    setInputMode((currentMode) => (currentMode === 'ko' ? 'en' : 'ko'));
  };

  const cat = (id) => categories.find(c => c.id === id);
  const activeLetterRows = inputMode === 'ko' ? KOREAN_ROWS : ENGLISH_ROWS;

  return (
    <div className={`search-screen ${embedded ? 'search-screen-embedded' : 'screen-enter'}`}>
      {!embedded && (
        <header className="screen-header ss-header">
          <div style={{ width: 80 }} />
          <div>
            <div className="title">부스 검색</div>
            <div className="subtitle">연구센터 · 대학명으로 검색</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-back" onClick={goBack}>홈</button>
          </div>
        </header>
      )}

      <div className="ss-body">
        {/* 검색 입력 영역 */}
        <div className="ss-input-area">
          <div className={`ss-input-wrap ${query ? 'ss-input-wrap-filled' : ''}`}>
            <span className="ss-input-icon">
              <img alt="" src="/src/assets/icons/search.png" />
            </span>
            <span className={`ss-input-text ${query ? '' : 'ss-input-text-placeholder'}`}>
              {query || '검색어를 입력하세요'}
            </span>
            {query && (
              <button className="ss-input-clear" onClick={clearText}>✕</button>
            )}
          </div>
        </div>

        <div className="ss-main">
          {/* 결과 영역 */}
          <div className="ss-results-area">
            {!hasSearched ? (
              <div className="ss-empty">
                <p>연구센터명 또는 대학명으로<br />부스를 검색할 수 있습니다.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="ss-empty">
                <span>😔</span>
                <p>"{query}"에 대한 검색 결과가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="ss-result-count">
                  <span className="gradient-text">{results.length}개</span> 검색 결과
                </div>
                <div className="ss-result-list scrollable">
                  {results.map(b => {
                    const category = cat(b.category);
                    const categoryPresentation = getCategoryPresentation(category?.color);
                    return (
                      <button
                        key={b.id}
                        className="ss-result-item"
                        onClick={() => navigate('booth-detail', {
                          booth: b,
                          categoryId: b.category,
                          source: 'search',
                        })}
                      >
                        <div
                          className="ss-result-cat"
                          style={{
                            background: categoryPresentation.solidBackground,
                            color: categoryPresentation.textColor,
                            borderColor: categoryPresentation.borderColor,
                          }}
                        >
                          {category?.icon} {category?.label}
                        </div>
                        <div className="ss-result-info">
                          <span className="ss-result-name">{b.name}</span>
                          <span className="ss-result-univ">{b.univ}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 터치 키보드 */}
          <div className="ss-keyboard">
            <div className="ss-keyboard-top">
              <div className="ss-key-section">
                <div className="ss-key-section-label">빠른 입력</div>
                <div className="ss-quick-btns">
                  {QUICK_KEYWORDS.map(kw => (
                    <button
                      key={kw}
                      className={`ss-quick-btn ${query === kw ? 'ss-quick-active' : ''}`}
                      onClick={() => setQuery(kw)}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ss-key-section">
                <div className="ss-key-section-label">대학명 빠른 입력</div>
                <div className="ss-quick-btns">
                  {QUICK_UNIVERSITIES.map(key => (
                    <button key={key} className="ss-quick-btn" onClick={() => setQuery(key)}>{key}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ss-keyboard-layout">
              <div className="ss-key-row ss-key-row-numbers">
                {NUMBER_ROW.map((key) => (
                  <button key={key} className="ss-key" onClick={() => appendText(key)}>
                    {key}
                  </button>
                ))}
              </div>

              <div className="ss-key-row ss-key-row-alpha">
                {activeLetterRows[0].map((key) => (
                  <button key={key} className="ss-key" onClick={() => appendText(key)}>
                    {key}
                  </button>
                ))}
              </div>

              <div className="ss-key-row ss-key-row-alpha ss-key-row-alpha-middle">
                {activeLetterRows[1].map((key) => (
                  <button key={key} className="ss-key" onClick={() => appendText(key)}>
                    {key}
                  </button>
                ))}
              </div>

              <div className="ss-key-row ss-key-row-alpha ss-key-row-alpha-bottom">
                <button
                  className={`ss-key ss-key-mode ${inputMode === 'en' ? 'ss-key-mode-active' : ''}`}
                  onClick={toggleInputMode}
                >
                  한/영
                </button>
                {activeLetterRows[2].map((key) => (
                  <button key={key} className="ss-key" onClick={() => appendText(key)}>
                    {key}
                  </button>
                ))}
                <button className="ss-key ss-key-backspace" onClick={backspace} aria-label="지우기">
                  <span className="ss-key-backspace-icon" aria-hidden="true" />
                </button>
                <button className="ss-key ss-key-clear" onClick={clearText}>초기화</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
