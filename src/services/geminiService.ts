
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

/**
 * Generates guidance from an image using the Gemini API.
 * It will try multiple API keys if provided, failing over on rate limit errors.
 * @param prompt - The system instructions for the AI.
 * @param imageBase64 - The base64 encoded image of the worksheet page.
 * @param apiKeys - An array of Gemini API keys to try.
 * @returns The generated text content as a string.
 */
export const generateGuidanceFromImage = async (
  prompt: string,
  imageBase64: string,
  apiKeys: string[]
): Promise<string> => {
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API key provided. Please add one in the settings.');
  }

  // The API expects the raw base64 data, without the data URL prefix.
  const imageData = imageBase64.startsWith('data:') ? imageBase64.split(',')[1] : imageBase64;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageData,
            },
          },
        ],
      },
    ],
  };

  let lastError: Error | null = null;

  for (const [index, apiKey] of apiKeys.entries()) {
    try {
      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        console.warn(`Key ${index + 1} is rate-limited. Trying next key.`);
        lastError = new Error('Rate limit exceeded');
        continue; // Try the next key
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Gemini API Error with key ${index + 1}:`, errorData);
        lastError = new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        continue; // Try next key for other errors too
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      console.error('Unexpected Gemini API response format:', data);
      lastError = new Error('No content generated or unexpected response format from Gemini API.');
      // Don't continue here, this is a structural problem with the response
      break;

    } catch (error) {
      console.error(`Network or fetch error for Gemini API with key ${index + 1}:`, error);
      lastError = error instanceof Error ? error : new Error('A network error occurred');
      // Continue to next key on network errors
    }
  }

  if (lastError?.message.includes('Rate limit exceeded')) {
    throw new Error('All available Gemini API keys are currently rate-limited. Please try again later or add a new key.');
  }
  
  throw lastError || new Error('Failed to generate guidance from Gemini API with all available keys.');
};
