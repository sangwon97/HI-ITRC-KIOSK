import { useState, useCallback } from 'react';
import { callLLMAPI, parseJSONResponse } from '../utils/llmApi';
import { generateSystemPrompt } from '../utils/geminiPrompt';
import { executeAISearchAction } from '../utils/llmActions';
import { buildRagTour, getRelatedRagBoothsFromAnswer, searchRagBooths } from '../utils/ragApi';
import { getBoothById, getBoothsByUniversityQuery, searchBooths } from '../data/booths';
import { loadCenterData } from '../data/centerInfo';
import { getTechnologyAnswer, isTechnologyExplanationQuery } from '../data/technologyAnswers';

const SEARCH_PROFILE_STORAGE_KEY = 'hi-itrc-ai-search-profile';

function isTourIntent(question) {
  const normalized = normalizeIntentText(question);
  return ['투어', '코스', '순서', '로드맵', '둘러', '돌아'].some((term) => normalized.includes(term));
}

function updateInterestProfile(question, retrieved) {
  if (typeof window === 'undefined' || !retrieved) {
    return null;
  }

  try {
    const previous = JSON.parse(window.localStorage.getItem(SEARCH_PROFILE_STORAGE_KEY) || '{}');
    const tagCounts = { ...(previous.tagCounts || {}) };
    const categoryCounts = { ...(previous.categoryCounts || {}) };
    const keywords = retrieved.queryUnderstanding?.keywords || retrieved.expandedQuery || [];

    keywords.slice(0, 8).forEach((keyword) => {
      tagCounts[keyword] = Number(tagCounts[keyword] || 0) + 1;
    });

    retrieved.results.forEach((item) => {
      if (item.category) {
        categoryCounts[item.category] = Number(categoryCounts[item.category] || 0) + 1;
      }
    });

    const nextProfile = {
      tagCounts,
      categoryCounts,
      lastQuery: question,
      updatedAt: new Date().toISOString(),
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag]) => tag),
      topCategories: Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([category]) => category),
    };

    window.localStorage.setItem(SEARCH_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    return nextProfile;
  } catch {
    return null;
  }
}

function normalizeIntentText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function normalizeRagText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function isExplanationIntent(question) {
  const normalizedQuestion = normalizeIntentText(question);
  const explanationTerms = [
    '알려줘',
    '설명',
    '뭐야',
    '무엇',
    '의미',
    '개념',
    '대해',
    '란',
    '이란',
  ];
  const boothTerms = ['부스', '추천', '찾아', '찾고', '위치', '어디', '가고', '보고'];

  return (
    explanationTerms.some((term) => normalizedQuestion.includes(term)) &&
    !boothTerms.some((term) => normalizedQuestion.includes(term))
  );
}

function isCenterInfoIntent(question) {
  const normalizedQuestion = normalizeRagText(question);
  const centerTerms = ['센터', '연구센터', '사업단', '연구원', '부스'];
  const intentTerms = ['소개', '알려줘', '설명', '뭐야', '무엇', '대해', '상세', '찾기', '찾아'];

  return (
    centerTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term))) &&
    intentTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term)))
  );
}

function isCenterFindIntent(question) {
  const normalizedQuestion = normalizeRagText(question);
  const centerTerms = ['센터', '연구센터', '사업단', '연구원'];
  const findTerms = ['찾기', '찾아', '찾아줘', '찾고', '보여줘', '보여', '이동', '상세', '페이지'];

  return (
    centerTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term))) &&
    findTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term)))
  );
}

function isCenterNavigationIntent(question) {
  const normalizedQuestion = normalizeRagText(question);
  const centerTerms = ['센터', '연구센터', '사업단', '연구원', '부스'];
  const navigationTerms = [
    '센터소개',
    '부스소개',
    '소개해줘',
    '소개',
    '상세',
    '상세페이지',
    '페이지',
    '이동',
    '보여줘',
    '보여',
    '안내',
    '찾기',
    '찾아',
    '찾아줘',
  ];
  const meaningTerms = ['뭐야', '무엇', '의미', '뜻', '약자', '용어', '단어', '무슨'];

  if (meaningTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term)))) {
    return false;
  }

  return (
    centerTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term))) &&
    navigationTerms.some((term) => normalizedQuestion.includes(normalizeRagText(term)))
  );
}

function buildCenterNavigationResult(question, centerMatch, matchType = 'center_rag_match') {
  return {
    success: true,
    screen: 'booth-detail',
    data: {
      booth: centerMatch.booth,
      categoryId: centerMatch.booth.category,
      source: 'ai-search',
      query: question,
      matchType,
    },
    explanation: `${centerMatch.booth.univ} ${centerMatch.booth.name} 연구센터 정보 페이지로 이동합니다.`,
    confidence: Math.min(1, (centerMatch.score || 80) / 100),
  };
}

function buildLLMTechnologyPrompt(question) {
  return [
    '다음 질문은 전시 부스 추천 요청이 아니라 기술 개념 설명 요청입니다.',
    '한국어로 관람객이 이해하기 쉽게 4~6문장으로 설명해 주세요.',
    '부스명, 위치, 추천 목록은 만들지 말고 기술의 의미와 활용 예시만 설명해 주세요.',
    '',
    `질문: ${question}`,
  ].join('\n');
}

function scoreCenterMatch(query, center, booth) {
  const normalizedQuery = normalizeRagText(query);
  const centerName = normalizeRagText(center.name);
  const boothName = normalizeRagText(booth?.name);
  const univName = normalizeRagText(booth?.univ);
  const searchableText = normalizeRagText([
    center.name,
    center.persona,
    center.intro,
    booth?.name,
    booth?.univ,
    ...(center.faqs || []).flatMap((faq) => [faq.q, faq.a]),
  ].join(' '));

  let score = 0;

  if (centerName && normalizedQuery.includes(centerName)) score += 100;
  if (boothName && normalizedQuery.includes(boothName)) score += 100;
  if (centerName && centerName.includes(normalizedQuery)) score += 80;
  if (boothName && boothName.includes(normalizedQuery)) score += 80;
  if (univName && normalizedQuery.includes(univName)) score += 12;
  if (normalizedQuery.includes('g5aict') && searchableText.includes('g5aict')) score += 120;

  const tokens = normalizedQuery.match(/[a-z0-9]+|\p{Script=Hangul}{2,}/gu) || [];

  for (const token of tokens) {
    if (searchableText.includes(token)) {
      score += token.length >= 5 ? 10 : 4;
    }
  }

  return score;
}

async function findCenterMatch(query) {
  const centers = await loadCenterData();

  return Object.values(centers)
    .map((center) => {
      const booth = getBoothById(center.id);
      return {
        center,
        booth,
        score: scoreCenterMatch(query, center, booth),
      };
    })
    .filter((item) => item.booth && item.score >= 40)
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

async function findCenterMatchByRag(query) {
  try {
    const [centers, retrieved] = await Promise.all([
      loadCenterData(),
      searchRagBooths(query, { topK: 8, minScore: 0 }),
    ]);

    for (const item of retrieved.results || []) {
      const center = centers[item.id];
      const booth = getBoothById(item.id);
      if (center && booth) {
        return {
          center,
          booth,
          score: Math.max(60, Math.round(Number(item.score || 0) * 100)),
          rag: retrieved,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function buildCenterRagPrompt(question, centerMatch) {
  const { center, booth } = centerMatch;
  const faqs = (center.faqs || [])
    .slice(0, 5)
    .map((faq, index) => `FAQ ${index + 1}\nQ: ${faq.q}\nA: ${faq.a}`)
    .join('\n\n');

  return [
    '아래 전시 데이터만 근거로 질문에 답하세요.',
    '데이터에 없는 내용은 추측하지 말고, 확인 가능한 범위만 설명하세요.',
    '한국어로 관람객에게 설명하듯 3~5문장으로 답하세요.',
    '',
    '[센터 데이터]',
    `센터명: ${center.name}`,
    `대학/기관: ${booth?.univ || ''}`,
    `부스 ID: ${booth?.id || ''}`,
    `분야: ${booth?.category || ''}`,
    `페르소나: ${center.persona || ''}`,
    `소개: ${center.intro || ''}`,
    faqs ? `\n[FAQ]\n${faqs}` : '',
    '',
    `질문: ${question}`,
  ].join('\n');
}

function buildBoothsFromRagResults(retrieved) {
  const rawResults = retrieved.results || retrieved.tourStops || [];
  return rawResults
    .map((item) => {
      const booth = getBoothById(item.id);
      return booth
        ? {
            ...booth,
            ragScore: item.score,
            ragMetadata: item.metadata,
            ragScoreBreakdown: item.scoreBreakdown,
            ragMatchedKeywords: item.matchedKeywords,
            ragRecommendationReason: item.recommendationReason,
            ragRank: item.rank,
            tourStep: item.tourStep,
            distanceFromPrevious: item.distanceFromPrevious,
          }
        : null;
    })
    .filter(Boolean);
}

async function getRelatedRagBooths(question, answerText = '', topK = 4) {
  try {
    const retrieved = await getRelatedRagBoothsFromAnswer(question, answerText, { topK });
    return {
      booths: buildBoothsFromRagResults(retrieved),
      relatedQuery: retrieved.relatedQuery,
      extractedKeywords: retrieved.extractedKeywords,
      rag: {
        source: 'embedding',
        embeddingBackend: retrieved.embeddingBackend,
        expandedQuery: retrieved.expandedQuery,
        retrievalMethod: retrieved.retrievalMethod,
        weights: retrieved.weights,
        queryUnderstanding: retrieved.queryUnderstanding,
        categoryClusters: retrieved.categoryClusters,
        clarification: retrieved.clarification,
        fallbackApplied: retrieved.fallbackApplied,
        mapPayload: retrieved.mapPayload,
        relatedQuery: retrieved.relatedQuery,
        extractedKeywords: retrieved.extractedKeywords,
        scores: (retrieved.results || []).map((item) => ({
          id: item.id,
          score: item.score,
          scoreBreakdown: item.scoreBreakdown,
        })),
      },
    };
  } catch {
    return { booths: [], relatedQuery: '', extractedKeywords: [], rag: null };
  }
}

function buildRelatedBoothQuery(question, answerText = '', keywords = []) {
  return [question, ...keywords, answerText]
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 900)
    .trim();
}

function extractRelatedKeywords(text, limit = 12) {
  const tokens = String(text || '')
    .normalize('NFC')
    .toLowerCase()
    .match(/[a-z0-9+#.-]+|[가-힣]{2,}/g) || [];
  const stopwords = new Set([
    '기술',
    '설명',
    '관련',
    '부스',
    '추천',
    '연구',
    '센터',
    '대한',
    '위해',
    '통해',
    '있는',
    '하는',
    '한다',
    '된다',
    '입니다',
    '그리고',
  ]);

  return [...new Set(tokens.filter((token) => !stopwords.has(token)))]
    .sort((a, b) => b.length - a.length)
    .slice(0, limit);
}

function logRelatedBoothTrace({ question, answerText, relatedQuery, extractedKeywords, related }) {
  const payload = {
    question,
    answerPreview: String(answerText || '').slice(0, 700),
    relatedQuery,
    extractedKeywords,
    matchedBooths: related.booths.map((booth) => ({
      id: booth.id,
      name: booth.name,
      univ: booth.univ,
      category: booth.category,
      matchedKeywords: booth.ragMatchedKeywords || [],
      recommendationReason: booth.ragRecommendationReason || '',
      score: booth.ragScore,
    })),
  };

  console.info('[AI Related Booths]', payload);
}

function buildAnswerResult({ title, summary, query, matchType, explanation, relatedBooths = [], rag = null }) {
  return {
    success: true,
    screen: 'search',
    data: {
      ai_answer: {
        id: matchType,
        title,
        summary,
        points: [],
      },
      ai_search_results: relatedBooths,
      related_booths_title: '관련 부스 추천',
      rag,
      query,
      source: 'ai-search',
      matchType,
    },
    explanation,
    confidence: 1,
    timestamp: new Date().toISOString(),
  };
}

export default function useAISearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState('');

  const searchWithAI = useCallback(async (question, onNavigate) => {
    if (!question.trim()) {
      setError('질문을 입력해주세요.');
      setResult(null);
      return;
    }

    setQuery(question);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const asksForExplanation = isTechnologyExplanationQuery(question) || isExplanationIntent(question);
      const asksForCenterInfo = isCenterInfoIntent(question);
      const asksForCenterFind = isCenterFindIntent(question) || isCenterNavigationIntent(question);

      if (asksForCenterFind) {
        const centerMatch = await findCenterMatch(question);
        const ragCenterMatch = centerMatch || await findCenterMatchByRag(question);

        if (ragCenterMatch) {
          const actionResult = buildCenterNavigationResult(
            question,
            ragCenterMatch,
            centerMatch ? 'center_direct_match' : 'center_rag_top_match',
          );

          setResult({
            ...actionResult,
            timestamp: new Date().toISOString(),
          });

          if (onNavigate) {
            onNavigate(actionResult.screen, actionResult.data);
          }

          return;
        }
      }

      if (asksForExplanation || asksForCenterInfo) {
        const centerMatch = await findCenterMatch(question);

        if (centerMatch) {
          const responseText = await callLLMAPI(buildCenterRagPrompt(question, centerMatch));
          const related = await getRelatedRagBooths(question, responseText, 4);
          logRelatedBoothTrace({
            question,
            answerText: responseText,
            relatedQuery: related.relatedQuery,
            extractedKeywords: related.extractedKeywords,
            related,
          });
          setResult(buildAnswerResult({
            title: centerMatch.center.name,
            summary: responseText,
            query: question,
            matchType: 'center_rag_answer',
            explanation: '전시 센터 데이터를 바탕으로 답변해드릴게요.',
            relatedBooths: related.booths,
            rag: related.rag,
          }));
          return;
        }
      }

      if (asksForExplanation) {
        const technologyAnswer = getTechnologyAnswer(question);

        if (technologyAnswer) {
          const answerText = `${technologyAnswer.title} ${technologyAnswer.summary}`;
          const related = await getRelatedRagBooths(question, answerText, 4);
          logRelatedBoothTrace({
            question,
            answerText,
            relatedQuery: related.relatedQuery,
            extractedKeywords: related.extractedKeywords,
            related,
          });
          setResult({
            success: true,
            screen: 'search',
            data: {
              ai_answer: technologyAnswer,
              ai_search_results: related.booths,
              related_booths_title: '관련 부스 추천',
              rag: related.rag,
              query: question,
              source: 'ai-search',
              matchType: 'technology_answer',
            },
            explanation: `${technologyAnswer.title}에 대해 설명해드릴게요.`,
            confidence: 1,
            timestamp: new Date().toISOString(),
          });

          return;
        }

        const responseText = await callLLMAPI(buildLLMTechnologyPrompt(question));
        const related = await getRelatedRagBooths(question, responseText, 4);
        logRelatedBoothTrace({
          question,
          answerText: responseText,
          relatedQuery: related.relatedQuery,
          extractedKeywords: related.extractedKeywords,
          related,
        });
        setResult(buildAnswerResult({
          title: question,
          summary: responseText,
          query: question,
          matchType: 'llm_technology_answer',
          explanation: '기술 개념을 설명해드릴게요.',
          relatedBooths: related.booths,
          rag: related.rag,
        }));
        return;
      }

      const universityBooths = getBoothsByUniversityQuery(question);

      if (universityBooths.length === 1) {
        const booth = universityBooths[0];
        const actionResult = {
          success: true,
          screen: 'booth-detail',
          data: {
            booth,
            categoryId: booth.category,
            source: 'ai-search',
          },
          explanation: `${booth.univ} ${booth.name} 부스로 이동합니다.`,
          confidence: 1,
        };

        setResult({
          ...actionResult,
          timestamp: new Date().toISOString(),
        });

        if (onNavigate) {
          onNavigate(actionResult.screen, actionResult.data);
        }

        return;
      }

      if (universityBooths.length > 1) {
        const actionResult = {
          success: true,
          screen: 'search',
          data: {
            ai_search_results: universityBooths,
            query: question,
            source: 'ai-search',
            matchType: 'university_multiple',
            universityName: universityBooths[0].univ,
          },
          explanation: `${universityBooths[0].univ} 부스가 ${universityBooths.length}개 있습니다. 어떤 연구센터를 보시겠어요?`,
          confidence: 1,
        };

        setResult({
          ...actionResult,
          timestamp: new Date().toISOString(),
        });

        return;
      }

      const retrieved = isTourIntent(question)
        ? await buildRagTour(question, { topK: 5 })
        : await searchRagBooths(question, { topK: 6, minScore: 0 });
      const rawResults = retrieved.results || retrieved.tourStops || [];
      const interestProfile = updateInterestProfile(question, {
        ...retrieved,
        results: rawResults,
      });
      const retrievedBooths = rawResults
        .map((item) => {
          const booth = getBoothById(item.id);
          return booth
            ? {
                ...booth,
                ragScore: item.score,
                ragMetadata: item.metadata,
                ragScoreBreakdown: item.scoreBreakdown,
                ragMatchedKeywords: item.matchedKeywords,
                ragRecommendationReason: item.recommendationReason,
                ragRank: item.rank,
                tourStep: item.tourStep,
                distanceFromPrevious: item.distanceFromPrevious,
              }
            : null;
        })
        .filter(Boolean);

      if (retrievedBooths.length > 0) {
        const actionResult = {
          success: true,
          screen: 'search',
          data: {
            ai_search_results: retrievedBooths,
            query: question,
            source: 'ai-search',
            rag: {
              source: retrieved.source,
              embeddingBackend: retrieved.embeddingBackend,
              expandedQuery: retrieved.expandedQuery,
              retrievalMethod: retrieved.retrievalMethod,
              weights: retrieved.weights,
              queryUnderstanding: retrieved.queryUnderstanding,
              categoryClusters: retrieved.categoryClusters,
              clarification: retrieved.clarification,
              fallbackApplied: retrieved.fallbackApplied,
              interestProfile,
              mapPayload: retrieved.mapPayload,
              scores: rawResults.map((item) => ({
                id: item.id,
                score: item.score,
                scoreBreakdown: item.scoreBreakdown,
              })),
            },
            ai_tour_plan: retrieved.tourStops || null,
          },
          explanation: `질문과 의미적으로 가까운 부스 ${retrievedBooths.length}개를 찾았습니다.`,
          confidence: 1,
        };

        setResult({
          ...actionResult,
          timestamp: new Date().toISOString(),
        });

        return;
      }

      const systemPrompt = generateSystemPrompt();
      const responseText = await callLLMAPI(question, systemPrompt);
      const llmResponse = parseJSONResponse(responseText);
      const actionResult = executeAISearchAction(llmResponse);

      if (actionResult.success) {
        setResult({
          ...actionResult,
          timestamp: new Date().toISOString(),
        });

        if (
          onNavigate &&
          actionResult.screen &&
          !(actionResult.screen === 'search' && actionResult.data?.ai_search_results)
        ) {
          onNavigate(actionResult.screen, actionResult.data);
        }
      } else {
        setError(actionResult.error || '요청 처리에 실패했습니다.');
        setResult(actionResult);
      }
    } catch (err) {
      console.error('AI 검색 오류:', err);

      const errorMessage = err.message || '알 수 없는 오류가 발생했습니다.';
      const isQuotaError = /quota|rate limit|429|쿼터|한도/i.test(errorMessage);
      const fallbackResults = isQuotaError ? searchBooths(question) : [];

      if (isQuotaError && fallbackResults.length > 0) {
        setResult({
          success: true,
          data: {
            ai_search_results: fallbackResults,
          },
          explanation: 'AI 요청 한도 또는 서버 문제로 로컬 검색 결과를 보여드립니다.',
          timestamp: new Date().toISOString(),
        });
        setError(null);
      } else {
        setError(errorMessage);
        setResult({
          success: false,
          error: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearState = useCallback(() => {
    setQuery('');
    setError(null);
    setResult(null);
    setLoading(false);
  }, []);

  return {
    query,
    loading,
    error,
    result,
    searchWithAI,
    clearState,
    setQuery,
  };
}
