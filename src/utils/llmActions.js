import { getBoothsByCategory, getBoothById } from '../data/booths';
import { validateLLMResponse, determineAction } from './llmMatching';

export function buildNavigationFromAction(validatedResponse) {
  const actionPlan = determineAction(validatedResponse);
  const { action, action_value, booths } = actionPlan;

  switch (action) {
    case 'filter_category':
      return {
        screen: 'booth-browser',
        data: {
          activeCategory: action_value,
          source: 'ai-search',
          query: validatedResponse.explanation,
        },
      };

    case 'show_booth_detail': {
      const booth = getBoothById(action_value);
      if (!booth) {
        return {
          screen: 'search',
          data: { error: '부스를 찾을 수 없습니다.' },
        };
      }

      return {
        screen: 'booth-detail',
        data: {
          booth,
          categoryId: booth.category,
          source: 'ai-search',
        },
      };
    }

    case 'show_booth_list': {
      const selectedBooths = booths.map((id) => getBoothById(id)).filter(Boolean);

      if (selectedBooths.length === 1) {
        return {
          screen: 'booth-detail',
          data: {
            booth: selectedBooths[0],
            categoryId: selectedBooths[0].category,
            source: 'ai-search',
          },
        };
      }

      return {
        screen: 'search',
        data: {
          ai_search_results: selectedBooths,
          query: validatedResponse.explanation,
          source: 'ai-search',
        },
      };
    }

    case 'show_poster':
    case 'show_center_info': {
      const booth = getBoothById(action_value);
      if (!booth) {
        return {
          screen: 'search',
          data: { error: '부스를 찾을 수 없습니다.' },
        };
      }

      return {
        screen: action === 'show_poster' ? 'poster' : 'center',
        data: {
          booth,
          categoryId: booth.category,
          source: 'ai-search',
        },
      };
    }

    case 'show_info':
      return {
        screen: 'info',
        data: {
          source: 'ai-search',
        },
      };

    case 'show_search_results':
    default: {
      const selectedBooths = booths.map((id) => getBoothById(id)).filter(Boolean);

      return {
        screen: 'search',
        data: {
          ai_search_results: selectedBooths.length > 0 ? selectedBooths : getBoothsByCategory(action_value),
          query: validatedResponse.explanation,
          source: 'ai-search',
        },
      };
    }
  }
}

export function executeAISearchAction(llmResponse) {
  try {
    const validatedResponse = validateLLMResponse(llmResponse);

    if (!validatedResponse.understood) {
      return {
        success: false,
        error: '질문을 이해하지 못했습니다. 다시 입력해 주세요.',
        suggestion: '부스명, 대학명, 분야를 포함해 질문해 주세요.',
      };
    }

    const navigation = buildNavigationFromAction(validatedResponse);

    return {
      success: true,
      screen: navigation.screen,
      data: navigation.data,
      explanation: validatedResponse.explanation,
      confidence: validatedResponse.confidence,
    };
  } catch (error) {
    console.error('LLM action execution failed:', error);
    return {
      success: false,
      error: '요청 처리 중 오류가 발생했습니다.',
      details: error.message,
    };
  }
}
