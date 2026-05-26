import { useEffect, useState } from 'react';
import { CATEGORY_MAP } from '../../../data/booths';
import { NUMBER_ROW, KOREAN_ROWS, ENGLISH_ROWS } from '../../../data/keyboard';
import { getCategoryPresentation } from '../../../utils/categoryPresentation';
import { appendHangulInput, removeLastHangulInput } from '../../../utils/hangulInput';
import { loadBoothPosters } from '../../../data/posters';
import useAISearch from '../../../hooks/useAISearch';
import { logRagInteraction } from '../../../utils/ragApi';
import './styles.css';

function TypewriterText({ text, speed = 18 }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    setVisibleText('');

    if (!text) {
      return undefined;
    }

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(intervalId);
      }
    }, speed);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [speed, text]);

  return (
    <p className="ais-answer-typewriter" aria-live="polite">
      {visibleText}
      {visibleText.length < text.length && <span className="ais-typewriter-caret" aria-hidden="true" />}
    </p>
  );
}

const EMPTY_RESULTS = [];

const CENTER_REFINEMENT_RULES = [
  {
    terms: ['ai', '인공지능', '인공 지능'],
    title: 'AI 분야가 넓습니다',
    message: 'AI 연구센터는 여러 전시 분야에 걸쳐 있습니다. 찾고 싶은 연구 방향을 먼저 선택해주세요.',
    options: ['AI·빅데이터', '반도체·디스플레이', '인공지능 플랫폼·서비스', '첨단 로봇·모빌리티', '첨단 바이오·헬스케어', '클라우드·보안·블록체인'],
  },
  {
    terms: ['보안', 'security'],
    title: '보안 분야를 좁혀주세요',
    message: '보안 관련 연구센터는 클라우드, 블록체인, AI 보안 등으로 나뉩니다.',
    options: ['클라우드·보안·블록체인', '특별전시관', 'AI·빅데이터'],
  },
  {
    terms: ['로봇', '드론', '모빌리티', '무인'],
    title: '이동체 분야를 좁혀주세요',
    message: '로봇·드론 관련 연구는 모빌리티, 통신, 군집체계로 나뉠 수 있습니다.',
    options: ['첨단 로봇·모빌리티', '차세대 통신·위성', '특별전시관'],
  },
];

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export default function AISearchScreen({ navigate, embedded = false, data = null }) {
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState('ko');
  const [posterItems, setPosterItems] = useState([]);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState(null);
  const [restoredSearchState, setRestoredSearchState] = useState(() => data?.aiSearchState ?? null);
  const [refinementPrompt, setRefinementPrompt] = useState(null);
  const { query, loading, error, result, searchWithAI, clearState } = useAISearch();

  const activeResult = result || restoredSearchState?.result || null;
  const activeQuery = query || restoredSearchState?.query || '';
  const displayResults = activeResult?.data?.ai_search_results || EMPTY_RESULTS;
  const ragInfo = activeResult?.data?.rag || null;
  const categoryClusters = ragInfo?.categoryClusters || [];
  const clarification = ragInfo?.clarification || null;
  const isPosterQuery = /포스터/.test((activeResult?.data?.query || inputValue || '').toLowerCase());
  const answer = activeResult?.data?.ai_answer || null;
  const posterQueryText = (activeResult?.data?.query || inputValue || '').toLowerCase();
  const firstResultBoothId = displayResults[0]?.id || '';
  const answerNarration = answer
    ? `${answer.summary}\n\n${answer.points.map((point) => `- ${point}`).join('\n')}`
    : '';
  const activeLetterRows = inputMode === 'ko' ? KOREAN_ROWS : ENGLISH_ROWS;
  const SEARCH_TEMPLATES = [
    '관련 부스 추천',
    '키워드 설명',
    '연구센터 찾기',
    '포스터 상세보기',
  ];

  const CATEGORY_LABELS = Array.from(CATEGORY_MAP.values())
    .map((category) => category?.label)
    .filter(Boolean);

  const stripTrailingSearchDirectives = (value) => {
    let nextValue = String(value || '').trim().replace(/\s+/g, ' ');

    for (let i = 0; i < 6; i += 1) {
      const previousValue = nextValue;
      [...SEARCH_TEMPLATES, ...CATEGORY_LABELS].forEach((suffix) => {
        if (suffix && nextValue.endsWith(suffix)) {
          nextValue = nextValue.slice(0, -suffix.length).trim();
        }
      });

      if (nextValue === previousValue) {
        break;
      }
    }

    return nextValue || String(value || '').trim();
  };

  const getCenterRefinementPrompt = (question) => {
    const normalized = normalizeSearchText(question);
    const isCenterFind = /센터|연구센터|사업단|연구원/.test(question)
      && /찾기|찾아|찾아줘|보여줘|상세|페이지|이동/.test(question);

    if (!isCenterFind) {
      return null;
    }

    const alreadySpecific = CATEGORY_LABELS.some((label) => normalizeSearchText(label)
      && normalized.includes(normalizeSearchText(label)));
    if (alreadySpecific) {
      return null;
    }

    const rule = CENTER_REFINEMENT_RULES.find((item) =>
      item.terms.some((term) => normalized.includes(normalizeSearchText(term))));

    if (!rule) {
      return null;
    }

    return {
      ...rule,
      question: question.trim(),
    };
  };

  const runSearch = async (question, options = {}) => {
    const nextQuestion = question.trim();
    if (!nextQuestion) {
      return;
    }

    const nextPrompt = !options.skipRefinement ? getCenterRefinementPrompt(nextQuestion) : null;
    if (nextPrompt) {
      setInputValue(nextQuestion);
      setRefinementPrompt(nextPrompt);
      return;
    }

    setRefinementPrompt(null);
    setInputValue(nextQuestion);
    setRestoredSearchState(null);
    await searchWithAI(nextQuestion, (screen, data) => {
      navigate(screen, data);
    });
  };

  const handleSearch = async () => {
    await runSearch(inputValue);
  };

  const handleCategoryClusterSearch = async (cluster) => {
    const baseQuery = stripTrailingSearchDirectives(activeResult?.data?.query || activeQuery || inputValue);
    await runSearch(cluster.refinementQuery || `${baseQuery} ${cluster.categoryLabel} 관련 부스 추천`);
  };

  const handleRefinementSelect = async (option) => {
    if (!refinementPrompt) {
      return;
    }

    const baseQuery = stripTrailingSearchDirectives(refinementPrompt.question);
    await runSearch(`${baseQuery} ${option} 연구센터 찾기`, { skipRefinement: true });
  };

  const handleTemplateSearch = (template) => {
    const suffix = template.replace(/^~\s*/, '');
    setInputValue((currentValue) => {
      const trimmed = currentValue.trim();
      if (!trimmed) {
        return template;
      }

      const previousTemplate = SEARCH_TEMPLATES.find((item) => trimmed.endsWith(item));
      if (previousTemplate) {
        const base = trimmed.slice(0, -previousTemplate.length).trim();
        return base ? `${base} ${suffix}` : suffix;
      }

      return `${trimmed} ${suffix}`;
    });
  };

  const handleClear = () => {
    setInputValue('');
    setRestoredSearchState(null);
    clearState();
  };

  const handlePosterClick = (poster) => {
    const booth = displayResults[0];
    if (booth?.id) {
      logRagInteraction({
        boothId: booth.id,
        eventType: 'poster_view',
        query: activeQuery || inputValue,
        source: 'ai-search-poster',
        metadata: { posterId: poster.id },
      });
    }
    navigate('poster', {
      poster,
      booth,
      categoryId: booth?.category,
      source: 'ai-search-poster',
      backTarget: 'ai-search',
      aiSearchState: {
        query: activeQuery || activeResult?.data?.query || inputValue,
        inputValue,
        result: activeResult,
      },
    });
  };

  const getCurrentSearchState = () => ({
    query: activeQuery || activeResult?.data?.query || inputValue,
    inputValue,
    result: activeResult,
  });

  useEffect(() => {
    setRestoredSearchState(data?.aiSearchState ?? null);
  }, [data]);

  useEffect(() => {
    if (data?.aiSearchState?.inputValue) {
      setInputValue(data.aiSearchState.inputValue);
      return;
    }

    if (data?.aiSearchState?.query) {
      setInputValue(data.aiSearchState.query);
    }
  }, [data]);

  useEffect(() => {
    const shouldShowPosters = /포스터/.test(posterQueryText) && Boolean(firstResultBoothId);
    if (!shouldShowPosters) {
      setPosterItems([]);
      setPosterError(null);
      setPosterLoading(false);
      return undefined;
    }

    let canceled = false;
    setPosterLoading(true);
    setPosterError(null);
    setPosterItems([]);

    loadBoothPosters(firstResultBoothId)
      .then((posters) => {
        if (canceled) return;
        setPosterItems(posters);
        setPosterLoading(false);
      })
      .catch(() => {
        if (canceled) return;
        setPosterError('포스터를 불러오는 데 실패했습니다.');
        setPosterLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [firstResultBoothId, posterQueryText]);

  const appendText = (text) => {
    setInputValue((currentValue) => {
      if (inputMode === 'ko') {
        return appendHangulInput(currentValue, text);
      }

      return currentValue + text;
    });
  };

  const backspace = () => {
    setInputValue((currentValue) => removeLastHangulInput(currentValue));
  };

  const toggleInputMode = () => {
    setInputMode((currentMode) => (currentMode === 'ko' ? 'en' : 'ko'));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleShowOnMap = () => {
    if (displayResults.length === 0) {
      return;
    }

    displayResults.forEach((booth) => {
      logRagInteraction({
        boothId: booth.id,
        eventType: 'map_focus',
        query: activeQuery || inputValue,
        source: 'ai-search',
      });
    });

    navigate('home', {
      source: 'ai-search',
      highlightBoothIds: ragInfo?.mapPayload?.highlightBoothIds || displayResults.map((booth) => booth.id),
      focusBoothId: ragInfo?.mapPayload?.focusBoothId || displayResults[0]?.id,
      highlightTitle: activeQuery || inputValue,
      highlightDescription: activeResult?.explanation,
      tourPlan: activeResult?.data?.ai_tour_plan || null,
    });
  };

  return (
    <div className={`ai-search-screen ${embedded ? 'ai-search-embedded' : ''}`}>
      <div className={`ais-content-shell ${refinementPrompt ? 'ais-content-shell-blurred' : ''}`}>
        <div className="ais-input-area">
          <div className="ais-input-group">
            <input
              type="text"
              className="ais-input-field"
              placeholder="AI 부스 추천, 서강대 부스, 양자 연구센터"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            {inputValue && (
              <button
                type="button"
                className="ais-input-clear"
                onClick={() => setInputValue('')}
                disabled={loading}
                aria-label="입력 지우기"
              >
                ×
              </button>
            )}
          </div>

          <div className="ais-template-bar" aria-label="AI 검색 템플릿">
            <span className="ais-template-label">검색 템플릿:</span>
            {SEARCH_TEMPLATES.map((template) => (
              <button
                key={template}
                type="button"
                className="ais-template-chip"
                onClick={() => handleTemplateSearch(template)}
                disabled={loading}
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="ais-main-layout">
        <div className="ais-keyboard" aria-label="AI 질문 키보드">
          <div className="ais-key-row ais-key-row-numbers">
            {NUMBER_ROW.map((key) => (
              <button key={key} type="button" className="ais-key" onClick={() => appendText(key)} disabled={loading}>
                {key}
              </button>
            ))}
            <button type="button" className="ais-key ais-key-backspace" onClick={backspace} disabled={loading}>
              지우기
            </button>
          </div>

          <div className="ais-key-row ais-key-row-alpha">
            {activeLetterRows[0].map((key) => (
              <button key={key} type="button" className="ais-key" onClick={() => appendText(key)} disabled={loading}>
                {key}
              </button>
            ))}
          </div>

          <div className="ais-key-row ais-key-row-alpha ais-key-row-middle">
            {activeLetterRows[1].map((key) => (
              <button key={key} type="button" className="ais-key" onClick={() => appendText(key)} disabled={loading}>
                {key}
              </button>
            ))}
            <button
              type="button"
              className="ais-key ais-key-search"
              onClick={handleSearch}
              disabled={loading || !inputValue.trim()}
            >
              {loading ? '검색 중' : '검색'}
            </button>
          </div>

          <div className="ais-key-row ais-key-row-alpha ais-key-row-bottom">
            <button
              type="button"
              className={`ais-key ais-key-mode ${inputMode === 'en' ? 'ais-key-mode-active' : ''}`}
              onClick={toggleInputMode}
              disabled={loading}
            >
              한/영
            </button>
            {activeLetterRows[2].map((key) => (
              <button key={key} type="button" className="ais-key" onClick={() => appendText(key)} disabled={loading}>
                {key}
              </button>
            ))}
            <button type="button" className="ais-key ais-key-space" onClick={() => appendText(' ')} disabled={loading}>
              Space
            </button>
            <button type="button" className="ais-key ais-key-clear" onClick={handleClear} disabled={loading}>
              초기화
            </button>
          </div>
        </div>

        <div className="ais-results-pane">
          {!loading && !activeResult && !error && (
            <>
              <div className="ais-help-text">
                <p>AI에게 질문하세요. 예시:</p>
                <ul>
                  <li>"AI 기술 관련 부스 추천해줘"</li>
                  <li>"G5-AICT 연구센터를 보고 싶어"</li>
                  <li>"6G 통신 기술 알려줘"</li>
                  <li>"포스터를 확인하고 싶어"</li>
                </ul>
              </div>

              <div className="ais-welcome">
                <h2>AI 질문 검색</h2>
                <p>부스나 기술에 대해 질문하면 관련 부스와 위치를 찾아드립니다.</p>
              </div>
            </>
          )}

          {loading && (
            <div className="ais-loading">
              <div className="ais-spinner" />
              <p>질문을 분석 중입니다...</p>
            </div>
          )}

          {error && (
            <div className="ais-error">
              <p className="ais-error-title">오류</p>
              <p className="ais-error-message">{error}</p>
              <p className="ais-error-suggestion">다시 시도해주세요.</p>
            </div>
          )}

          {activeResult && activeResult.success && isPosterQuery && (
            <div className="ais-poster-results">
              <div className="ais-result-header">
                <h2 className="ais-result-title">포스터 카드</h2>
                <p className="ais-result-explanation">
                  선택된 연구센터의 포스터를 카드 형태로 보여드립니다. 클릭하면 설명이 뒤집혀서 나와요.
                </p>
              </div>

              {posterLoading && (
                <div className="ais-loading">
                  <div className="ais-spinner" />
                  <p>포스터를 불러오는 중입니다...</p>
                </div>
              )}

              {posterError && (
                <div className="ais-error">
                  <p className="ais-error-title">오류</p>
                  <p className="ais-error-message">{posterError}</p>
                </div>
              )}

              {!posterLoading && !posterError && posterItems.length === 0 && (
                <div className="ais-empty">
                  <span className="ais-empty-icon">📄</span>
                  <p>이 연구센터의 포스터를 찾을 수 없습니다.</p>
                  <p className="ais-empty-hint">다른 키워드로 다시 시도해보세요.</p>
                </div>
              )}

              {!posterLoading && !posterError && posterItems.length > 0 && (
                <div className="ais-poster-grid">
                  {posterItems.map((poster) => (
                    <button
                      key={poster.id}
                      type="button"
                      className="ais-poster-card"
                      onClick={() => handlePosterClick(poster)}
                    >
                      <img src={poster.image} alt={poster.title || poster.id} className="ais-poster-image" />
                      <div className="ais-poster-card-title">{poster.title || poster.id}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeResult && activeResult.success && displayResults.length > 0 && !isPosterQuery && !answer && (
            <div className="ais-results">
              <div className="ais-result-header">
                <h2 className="ais-result-title">검색 결과</h2>
                <p className="ais-result-explanation">
                  {activeResult.explanation}
                  <button type="button" className="ais-map-text-action" onClick={handleShowOnMap}>
                    3D 맵에서 확인
                  </button>
                </p>
              </div>

              {(categoryClusters.length > 1 || clarification) && (
                <div className="ais-cluster-panel">
                  {clarification?.message && (
                    <p className="ais-cluster-message">{clarification.message}</p>
                  )}
                  <div className="ais-cluster-tabs" aria-label="분야별 검색 좁히기">
                    {categoryClusters.map((cluster) => (
                      <button
                        key={cluster.category}
                        type="button"
                        className="ais-cluster-tab"
                        onClick={() => handleCategoryClusterSearch(cluster)}
                        disabled={loading}
                      >
                        <span>{cluster.categoryLabel}</span>
                        <strong>{cluster.count}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ais-result-list">
                {displayResults.map((booth) => {
                  const category = CATEGORY_MAP.get(booth.category);
                  const categoryPresentation = getCategoryPresentation(category?.color);
                  const matchedKeywords = booth.ragMatchedKeywords || booth.ragMetadata?.keywords?.slice(0, 4) || [];

                  return (
                    <button
                      key={booth.id}
                      className="ais-result-item"
                      onClick={() =>
                        navigate('booth-detail', {
                          booth,
                          categoryId: booth.category,
                          source: 'ai-search',
                          aiSearchState: getCurrentSearchState(),
                        })
                      }
                      onMouseDown={() => logRagInteraction({
                        boothId: booth.id,
                        eventType: 'search_result_click',
                        query: activeQuery || inputValue,
                        source: 'ai-search',
                      })}
                    >
                      <div
                        className="ais-result-category"
                        style={{
                          background: categoryPresentation.solidBackground,
                          color: categoryPresentation.textColor,
                          borderColor: categoryPresentation.borderColor,
                        }}
                      >
                        {category?.icon} {category?.label}
                      </div>
                      <div className="ais-result-info">
                        <span className="ais-result-name">
                          {booth.name}
                        </span>
                        <span className="ais-result-univ">{booth.univ}</span>
                        <span className="ais-result-reason">
                          {booth.ragRecommendationReason || `${category?.label || booth.category} 분야와 질문이 의미적으로 가깝습니다.`}
                        </span>
                        {matchedKeywords.length > 0 && (
                          <span className="ais-keyword-row">
                            {matchedKeywords.slice(0, 4).map((keyword) => (
                              <span key={keyword} className="ais-keyword-chip">{keyword}</span>
                            ))}
                          </span>
                        )}
                      </div>
                      <span className="ais-result-arrow">›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeResult && activeResult.success && answer && (
            <div className="ais-answer">
              <div className="ais-answer-kicker">기술 설명</div>
              <h2 className="ais-answer-title">{answer.title}</h2>
              <TypewriterText text={answerNarration} />
              {displayResults.length > 0 && (
                <div className="ais-answer-related">
                  <div className="ais-answer-related-title">
                    {activeResult.data?.related_booths_title || '관련 부스 추천'}
                  </div>
                  <div className="ais-answer-related-list">
                    {displayResults.map((booth) => (
                      <button
                        key={booth.id}
                        type="button"
                        className="ais-answer-related-item"
                        onClick={() =>
                          navigate('booth-detail', {
                            booth,
                            categoryId: booth.category,
                            source: 'ai-search',
                            aiSearchState: getCurrentSearchState(),
                          })
                        }
                        onMouseDown={() => logRagInteraction({
                          boothId: booth.id,
                          eventType: 'related_booth_click',
                          query: activeQuery || inputValue,
                          source: 'ai-search-related',
                        })}
                      >
                        <strong>{booth.name}</strong>
                        <span>{booth.univ}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeResult && activeResult.success && !answer && displayResults.length === 0 && (
            <div className="ais-empty">
              <span className="ais-empty-icon">검색</span>
              <p>일치하는 결과를 찾을 수 없습니다.</p>
              <p className="ais-empty-hint">다른 키워드로 시도해보세요.</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {refinementPrompt && (
        <div className="ais-refinement-overlay" role="presentation">
          <div className="ais-refinement-modal" role="dialog" aria-modal="true" aria-labelledby="ais-refinement-title">
            <div className="ais-refinement-kicker">연구센터 분야 선택</div>
            <h2 id="ais-refinement-title" className="ais-refinement-title">{refinementPrompt.title}</h2>
            <p className="ais-refinement-message">{refinementPrompt.message}</p>
            <div className="ais-refinement-options">
              {refinementPrompt.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="ais-refinement-option"
                  onClick={() => handleRefinementSelect(option)}
                  disabled={loading}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="ais-refinement-actions">
              <button type="button" className="ais-refinement-secondary" onClick={() => setRefinementPrompt(null)}>
                닫기
              </button>
              <button
                type="button"
                className="ais-refinement-primary"
                onClick={() => runSearch(refinementPrompt.question, { skipRefinement: true })}
                disabled={loading}
              >
                그대로 찾기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
