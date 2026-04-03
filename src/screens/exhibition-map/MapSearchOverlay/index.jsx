import { useState, useMemo } from 'react';
import { searchBooths, categories } from '../../../data/booths';
import { appendHangulInput, removeLastHangulInput } from '../../../utils/hangulInput';
import {
  NUMBER_ROW,
  KOREAN_ROWS,
  ENGLISH_ROWS,
  QUICK_KEYWORDS,
  QUICK_UNIVERSITIES,
} from '../../../data/keyboard';
import searchIcon from '../../../assets/icons/search.png';
import './styles.css';

export default function MapSearchOverlay({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [inputMode, setInputMode] = useState('ko');

  const results = useMemo(() => {
    if (query.trim().length >= 1) return searchBooths(query.trim());
    return [];
  }, [query]);

  const hasSearched = query.trim().length >= 1;
  const activeLetterRows = inputMode === 'ko' ? KOREAN_ROWS : ENGLISH_ROWS;

  const appendText = (text) => {
    setQuery((q) => inputMode === 'ko' ? appendHangulInput(q, text) : q + text);
  };

  const backspace = () => setQuery((q) => removeLastHangulInput(q));
  const clear = () => setQuery('');
  const toggleMode = () => setInputMode((m) => m === 'ko' ? 'en' : 'ko');

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="mso-overlay" onClick={handleBackdropClick}>
      <div className="mso-panel">
        {/* 헤더 */}
        <div className="mso-header">
          <div className={`mso-input-wrap ${query ? 'mso-input-filled' : ''}`}>
            <img src={searchIcon} alt="" className="mso-input-icon" />
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
            {!hasSearched ? (
              <div className="mso-empty">
                <p>센터명 또는 대학명으로<br />부스를 검색하면 3D 지도에서<br />길찾기로 안내합니다.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="mso-empty">
                <span>😔</span>
                <p>"{query}"에 대한<br />검색 결과가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="mso-result-count">
                  <span className="mso-result-num">{results.length}개</span> 검색 결과
                </div>
                <div className="mso-result-list scrollable">
                  {results.map(b => {
                    const category = categories.find(c => c.id === b.category);
                    return (
                      <button
                        key={b.id}
                        className="mso-result-item"
                        onClick={() => onSelect(b)}
                      >
                        <div className="mso-result-cat" style={{ background: `${category?.color}20`, color: category?.color }}>
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
              <div className="mso-sk-section">
                <div className="mso-sk-section-label">빠른 입력</div>
                <div className="mso-sk-quick-btns">
                  {QUICK_KEYWORDS.map(kw => (
                    <button
                      key={kw}
                      className={`mso-sk-quick-btn ${query === kw ? 'mso-sk-quick-active' : ''}`}
                      onClick={() => setQuery(kw)}
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
                    <button key={key} className="mso-sk-quick-btn" onClick={() => setQuery(key)}>{key}</button>
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
