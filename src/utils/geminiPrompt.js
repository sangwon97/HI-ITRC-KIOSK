import { booths, categories } from '../data/booths';

function buildBoothContext() {
  const boothsByCategory = {};
  const univBooths = {};

  booths.forEach((booth) => {
    if (!boothsByCategory[booth.category]) {
      boothsByCategory[booth.category] = [];
    }

    boothsByCategory[booth.category].push({
      id: booth.id,
      name: booth.name,
      univ: booth.univ,
    });

    if (!univBooths[booth.univ]) {
      univBooths[booth.univ] = [];
    }

    univBooths[booth.univ].push(booth.id);
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      label: category.label,
      count: boothsByCategory[category.id]?.length || 0,
    })),
    univBooths,
    allBooths: booths.map((booth) => ({
      id: booth.id,
      name: booth.name,
      univ: booth.univ,
      category: booth.category,
    })),
  };
}

export function generateSystemPrompt() {
  const context = buildBoothContext();

  return `
You are an AI search assistant for the Hi-IoP ITRC exhibition kiosk.
Analyze the user's Korean natural-language question and return only JSON.

Available categories:
${context.categories.map((category) => `- ${category.id}: ${category.label} (${category.count})`).join('\n')}

University booth counts:
${Object.keys(context.univBooths).slice(0, 20).map((univ) => `- ${univ}: ${context.univBooths[univ].length}`).join('\n')}

Booth sample:
${context.allBooths.slice(0, 20).map((booth) => `- [${booth.id}] ${booth.name} (${booth.univ}, ${booth.category})`).join('\n')}

Required JSON shape:
\`\`\`json
{
  "understood": true,
  "intent": "category_filter|booth_search|poster_search|info|unknown",
  "matched_booths": ["S1B1"],
  "action": "filter_category|show_booth_detail|show_booth_list|show_poster|show_center_info|show_info|show_search_results|unknown",
  "action_value": "ai_bigdata",
  "explanation": "short Korean explanation",
  "confidence": 0.9
}
\`\`\`

Rules:
- If several booths match, use "show_booth_list" and include their ids in matched_booths.
- If one booth clearly matches, use "show_booth_detail" and put its id in action_value.
- If the user asks for posters or research contents, use "show_poster".
- If the user asks for general exhibition information, use "show_info".
- If unsure, set understood=false, action="unknown", confidence below 0.6.
- Return JSON only. Do not add prose outside JSON.
`;
}
