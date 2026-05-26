/**
 * Python RAG service client.
 * The browser calls the Node backend, and the backend forwards this request to
 * the Python embedding search service.
 */

export async function searchRagBooths(query, { topK = 5, minScore = 0 } = {}) {
  const response = await fetch('/api/rag/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      top_k: topK,
      min_score: minScore,
      print_debug: import.meta.env.DEV,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `RAG search failed with HTTP ${response.status}`);
  }

  return {
    query: data?.query || query,
    source: 'embedding',
    embeddingBackend: data?.embeddingBackend || 'unknown',
    expandedQuery: Array.isArray(data?.expandedQuery) ? data.expandedQuery : [],
    retrievalMethod: data?.retrievalMethod || 'semantic',
    weights: data?.weights || null,
    queryUnderstanding: data?.queryUnderstanding || null,
    categoryClusters: Array.isArray(data?.categoryClusters) ? data.categoryClusters : [],
    clarification: data?.clarification || null,
    fallbackApplied: Boolean(data?.fallbackApplied),
    mapPayload: data?.mapPayload || null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function getRelatedRagBoothsFromAnswer(question, answer, { topK = 4 } = {}) {
  const response = await fetch('/api/rag/related', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      answer,
      top_k: topK,
      print_debug: import.meta.env.DEV,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `RAG related search failed with HTTP ${response.status}`);
  }

  return {
    question: data?.question || question,
    answerPreview: data?.answerPreview || '',
    relatedQuery: data?.relatedQuery || '',
    extractedKeywords: Array.isArray(data?.extractedKeywords) ? data.extractedKeywords : [],
    embeddingBackend: data?.embeddingBackend || 'unknown',
    retrievalMethod: data?.retrievalMethod || 'semantic',
    weights: data?.weights || null,
    queryUnderstanding: data?.queryUnderstanding || null,
    expandedQuery: Array.isArray(data?.expandedQuery) ? data.expandedQuery : [],
    categoryClusters: Array.isArray(data?.categoryClusters) ? data.categoryClusters : [],
    fallbackApplied: Boolean(data?.fallbackApplied),
    mapPayload: data?.mapPayload || null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export function logRagInteraction({ boothId, eventType = 'click', query = '', source = '', metadata = {} }) {
  if (!boothId) {
    return Promise.resolve(null);
  }

  return fetch('/api/rag/interaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      booth_id: boothId,
      event_type: eventType,
      query,
      source,
      metadata,
    }),
  }).then((response) => response.json().catch(() => null)).catch(() => null);
}

export async function getSimilarRagBooths(boothId, { topK = 5 } = {}) {
  const response = await fetch('/api/rag/similar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      booth_id: boothId,
      top_k: topK,
      print_debug: import.meta.env.DEV,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `RAG similar search failed with HTTP ${response.status}`);
  }

  return {
    sourceBoothId: data?.sourceBoothId || boothId,
    embeddingBackend: data?.embeddingBackend || 'unknown',
    retrievalMethod: data?.retrievalMethod || 'document-embedding-similarity',
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function buildRagTour(query, { topK = 5, currentBoothId = null, currentPosition = null } = {}) {
  const response = await fetch('/api/rag/tour', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      top_k: topK,
      current_booth_id: currentBoothId,
      current_position: currentPosition,
      print_debug: import.meta.env.DEV,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `RAG tour failed with HTTP ${response.status}`);
  }

  return {
    query: data?.query || query,
    embeddingBackend: data?.embeddingBackend || 'unknown',
    tourStops: Array.isArray(data?.tourStops) ? data.tourStops : [],
    highlightBoothIds: Array.isArray(data?.highlightBoothIds) ? data.highlightBoothIds : [],
  };
}
