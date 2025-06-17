
type TitledText = {
  title: string;
  content: string;
};

/**
 * Parse markdown text to extract sections with titles
 * @param text Markdown text input
 * @returns Array of titled text sections
 */
export const parseTitledText = (text: string): TitledText[] => {
  // Regular expression to match markdown headings with ** pattern
  const titleRegex = /\*\*(.*?)\*\*/g;
  const sections: TitledText[] = [];
  
  // Split the text by markdown headings
  const parts = text.split(/\*\*.*?\*\*/);
  
  // Extract all titles
  const titles: string[] = [];
  let match;
  while ((match = titleRegex.exec(text)) !== null) {
    titles.push(match[1]);
  }
  
  // First part is content before any title, we ignore it as per requirements
  // Start from the second part (index 1)
  for (let i = 0; i < titles.length; i++) {
    sections.push({
      title: titles[i],
      content: parts[i + 1]?.trim() || ""
    });
  }
  
  return sections;
};

/**
 * Format content with proper markdown formatting
 */
export const formatContent = (content: string): string => {
  return content.trim();
};
