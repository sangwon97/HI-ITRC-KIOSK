import { useState, useRef, useEffect } from 'react';
import { booths, searchBooths, categories } from '../data/booths';
import './SearchScreen.css';

// 키보드 자판 (가나다순 검색용 한글 초성 + 영문)
const KEYBOARD_ROWS = [
  ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'],
  ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'],
  ['KAIST', 'POSTECH', '고려', '부산', '서강', '서울', '성균관', '세종', '인하', '충북'],
];

export default function SearchScreen({ navigate, goBack, goHome }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

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
    setQuery(q => q + text);
  };

  const clearText = () => {
    setQuery('');
  };

  const backspace = () => {
    setQuery(q => q.slice(0, -1));
  };

  const cat = (id) => categories.find(c => c.id === id);

  return (
    <div className="search-screen screen-enter">
      {/* 헤더 */}
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

      <div className="ss-body">
        {/* 검색 입력 영역 */}
        <div className="ss-input-area">
          <div className="ss-input-wrap">
            <span className="ss-input-icon">🔍</span>
            <span className="ss-input-text">{query || '검색어를 입력하세요'}</span>
            {query && (
              <button className="ss-input-clear" onClick={clearText}>✕</button>
            )}
          </div>

          {/* 빠른 검색 버튼 */}
          <div className="ss-quick-btns">
            {['AI', '6G', '양자', '반도체', '헬스케어', '클라우드', '모빌리티', '블록체인'].map(kw => (
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

        <div className="ss-main">
          {/* 결과 영역 */}
          <div className="ss-results-area">
            {!hasSearched ? (
              <div className="ss-empty">
                <span>🔍</span>
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
                    return (
                      <button
                        key={b.id}
                        className="ss-result-item"
                        onClick={() => navigate('booth-detail', b)}
                      >
                        <div className="ss-result-cat" style={{ background: `${category?.color}20`, color: category?.color }}>
                          {category?.icon} {category?.label}
                        </div>
                        <div className="ss-result-info">
                          <span className="ss-result-name">{b.name}</span>
                          <span className="ss-result-univ">{b.univ}</span>
                        </div>
                        <span className="ss-result-id">{b.id}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 터치 키보드 */}
          <div className="ss-keyboard">
            <div className="ss-keyboard-label">터치 키보드</div>

            {/* 한글 초성 */}
            <div className="ss-key-section">
              <div className="ss-key-section-label">초성 검색</div>
              <div className="ss-keys">
                {KEYBOARD_ROWS[0].map(key => (
                  <button key={key} className="ss-key" onClick={() => appendText(key)}>{key}</button>
                ))}
              </div>
            </div>

            {/* 대학 빠른 입력 */}
            <div className="ss-key-section">
              <div className="ss-key-section-label">대학명 빠른 입력</div>
              <div className="ss-keys">
                {KEYBOARD_ROWS[2].map(key => (
                  <button key={key} className="ss-key ss-key-uni" onClick={() => appendText(key)}>{key}</button>
                ))}
              </div>
            </div>

            {/* 숫자 + 컨트롤 */}
            <div className="ss-key-section">
              <div className="ss-keys ss-keys-control">
                {['1','2','3','4','5','6','7','8','9','0'].map(k => (
                  <button key={k} className="ss-key" onClick={() => appendText(k)}>{k}</button>
                ))}
                <button className="ss-key ss-key-backspace" onClick={backspace}>⌫</button>
                <button className="ss-key ss-key-clear" onClick={clearText}>초기화</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
