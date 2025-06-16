
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
  // Regular expression to match markdown headings with ** pattern and capture text on same line
  const titleRegex = /\*\*(.*?)\*\*([^\n]*)/g;
  const sections: TitledText[] = [];
  
  // Split the text by markdown headings (including any text on the same line)
  const parts = text.split(/\*\*.*?\*\*[^\n]*/);
  
  // Extract all titles with their same-line text
  const titlesWithSameLineText: string[] = [];
  let match;
  while ((match = titleRegex.exec(text)) !== null) {
    const titlePart = match[1]; // The text inside **
    const sameLineText = match[2]?.trim() || ""; // Text after ** on same line
    
    // Combine title with same-line text if it exists
    const fullTitle = sameLineText ? `${titlePart} ${sameLineText}` : titlePart;
    titlesWithSameLineText.push(fullTitle);
  }
  
  // First part is content before any title, we ignore it as per requirements
  // Start from the second part (index 1)
  for (let i = 0; i < titlesWithSameLineText.length; i++) {
    const currentTitle = titlesWithSameLineText[i];
    const currentContent = parts[i + 1]?.trim() || "";
    
    // Check if current section has no content and there's a next title
    if (currentContent === "" && i + 1 < titlesWithSameLineText.length) {
      // Group consecutive empty titles together
      let groupedTitles = [currentTitle];
      let nextIndex = i + 1;
      
      // Collect all consecutive titles with empty content
      while (nextIndex < titlesWithSameLineText.length && (parts[nextIndex + 1]?.trim() || "") === "") {
        groupedTitles.push(titlesWithSameLineText[nextIndex]);
        nextIndex++;
      }
      
      // If we found consecutive empty titles, group them with the next title that has content
      if (nextIndex < titlesWithSameLineText.length) {
        groupedTitles.push(titlesWithSameLineText[nextIndex]);
        const finalContent = parts[nextIndex + 1]?.trim() || "";
        
        // Create a single section with combined titles as the main title
        const combinedTitle = groupedTitles.join(' - ');
        
        sections.push({
          title: combinedTitle,
          content: finalContent
        });
        
        // Skip the processed titles
        i = nextIndex;
      } else {
        // If no title with content follows, just add the empty title
        sections.push({
          title: currentTitle,
          content: currentContent
        });
      }
    } else {
      // Normal case: title with content
      sections.push({
        title: currentTitle,
        content: currentContent
      });
    }
  }
  
  return sections;
};

/**
 * Format content with proper markdown formatting
 */
export const formatContent = (content: string): string => {
  return content.trim();
};
