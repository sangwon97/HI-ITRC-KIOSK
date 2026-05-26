/**
 * Browser-side LLM helper.
 * The frontend always calls the Node backend so API keys and provider details
 * stay outside the browser.
 */

export async function callLLMAPI(prompt, systemPrompt = '') {
  try {
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemPrompt,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const rawMessage = data?.error || data?.message || `HTTP ${response.status}`;
      throw new Error(`Backend LLM error (${response.status}): ${rawMessage}`);
    }

    const responseText = data?.content || '';

    if (!responseText) {
      throw new Error('Backend LLM returned an empty response.');
    }

    return responseText;
  } catch (error) {
    console.error('Backend LLM call failed:', error);
    const message = error?.message || 'Unknown network error';
    throw new Error(
      `Backend LLM connection failed: ${message}. Check that npm run backend is running.`,
    );
  }
}

export function parseJSONResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonString = jsonMatch ? jsonMatch[1] : responseText;

    return JSON.parse(jsonString.trim());
  } catch (error) {
    console.error('JSON parsing failed:', error, responseText);
    throw new Error('Failed to parse the LLM response.');
  }
}
