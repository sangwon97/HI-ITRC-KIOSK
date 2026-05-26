import { useState, lazy, Suspense } from 'react';
import { CATEGORY_MAP } from '../../../data/booths';
import { appendHangulInput, removeLastHangulInput } from '../../../utils/hangulInput';
import { getCategoryPresentation } from '../../../utils/categoryPresentation';
import useBoothSearch from '../../../hooks/useBoothSearch';
import keyboardIcon from '../../../assets/icons/keyboard_regular.svg';
import {
  NUMBER_ROW,
  KOREAN_ROWS,
  ENGLISH_ROWS,
  QUICK_KEYWORDS,
  QUICK_UNIVERSITIES,
} from '../../../data/keyboard';
import './styles.css';

const AISearchScreen = lazy(() => import('../AISearchScreen'));

export default function SearchScreen({ navigate, goBack, goHome, embedded = false }) {
  const [query, setQuery] = useState('');
  const [inputMode, setInputMode] = useState('ko');
  const [searchMode, setSearchMode] = useState('keyboard'); // 'keyboard' | 'ai'
  const { hasSearched, results } = useBoothSearch(query);

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

      {/* 검색 모드 탭 */}
      <div className="ss-mode-tabs">
        <button
          className={`ss-mode-tab ${searchMode === 'keyboard' ? 'ss-mode-tab-active' : ''}`}
          onClick={() => setSearchMode('keyboard')}
        >
          키보드 검색
        </button>
        <button
          className={`ss-mode-tab ${searchMode === 'ai' ? 'ss-mode-tab-active' : ''}`}
          onClick={() => setSearchMode('ai')}
        >
          AI 질문
        </button>
      </div>

      <div className="ss-body">
        {/* 키보드 검색 모드 */}
        {searchMode === 'keyboard' && (
          <>
            {/* 검색 입력 영역 */}
            <div className="ss-input-area">
              <div className={`ss-input-wrap ${query ? 'ss-input-wrap-filled' : ''}`}>

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
                    <p>초성 검색으로 원하는 연구센터·대학교 부스를 빠르게 찾아볼 수 있습니다.</p>
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
                        const category = CATEGORY_MAP.get(b.category);
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
          </>
        )}

        {/* AI 검색 모드 */}
        {searchMode === 'ai' && (
          <Suspense fallback={<div className="ss-loading">로딩 중...</div>}>
            <AISearchScreen navigate={navigate} embedded={true} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
