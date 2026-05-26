import { categories, getBoothById } from '../data/booths';

function normalizeBoothId(booth) {
  if (typeof booth === 'string') {
    return booth.trim();
  }

  if (booth && typeof booth.id === 'string') {
    return booth.id.trim();
  }

  return null;
}

function validateAndGetBooth(boothId) {
  const id = normalizeBoothId(boothId);
  return id ? getBoothById(id) || null : null;
}

export function validateBooths(boothIds) {
  if (!Array.isArray(boothIds)) {
    return [];
  }

  return boothIds
    .map((id) => getBoothById(normalizeBoothId(id)))
    .filter(Boolean);
}

export function validateCategory(categoryId) {
  return categories.find((category) => category.id === categoryId) || null;
}

export function validateLLMResponse(llmResponse) {
  const {
    understood = false,
    intent = 'unknown',
    matched_booths = [],
    action = 'unknown',
    action_value = null,
    explanation = '',
    confidence = 0,
  } = llmResponse || {};

  const validBooths = validateBooths(matched_booths);

  let validatedActionValue = action_value;
  if (action === 'filter_category' || action === 'show_search_results') {
    const category = validateCategory(action_value);
    validatedActionValue = category ? action_value : null;
  } else if (
    action === 'show_booth_detail' ||
    action === 'show_poster' ||
    action === 'show_center_info'
  ) {
    const booth = validateAndGetBooth(action_value);
    validatedActionValue = booth ? action_value : null;
  }

  return {
    understood,
    intent,
    matched_booths: validBooths.map((booth) => booth.id),
    action: understood ? action : 'unknown',
    action_value: understood ? validatedActionValue : null,
    explanation,
    confidence: Math.min(Math.max(Number(confidence) || 0, 0), 1),
  };
}

export function determineAction(validatedResponse) {
  const { confidence, action, action_value, matched_booths } = validatedResponse;

  if (confidence < 0.6) {
    return {
      type: 'low_confidence',
      action: 'show_search_results',
      action_value,
      message: '명확하지 않은 검색입니다. 결과를 확인해 주세요.',
      booths: matched_booths,
    };
  }

  return {
    type: 'confident',
    action,
    action_value,
    message: validatedResponse.explanation,
    booths: matched_booths,
  };
}
