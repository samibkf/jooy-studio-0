
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

/**
 * Generates guidance from an image using the Gemini API.
 * @param prompt - The system instructions for the AI.
 * @param imageBase64 - The base64 encoded image of the worksheet page.
 * @param apiKey - The user's Gemini API key.
 * @returns The generated text content as a string.
 */
export const generateGuidanceFromImage = async (
  prompt: string,
  imageBase64: string,
  apiKey: string
): Promise<string> => {
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

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Gemini API Error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to generate guidance from Gemini API.');
  }

  const data = await response.json();
  
  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  console.error('Unexpected Gemini API response format:', data);
  throw new Error('No content generated or unexpected response format from Gemini API.');
};
