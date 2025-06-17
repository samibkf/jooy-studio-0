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
  // Regular expression to match markdown headings with ** pattern and capture text on the same line
  const titleRegex = /\*\*(.*?)\*\*([^\n]*)/g;
  const sections: TitledText[] = [];
  
  // Split the text by markdown headings, keeping the full line including text after **
  const parts = text.split(/\*\*.*?\*\*[^\n]*/);
  
  // Extract all titles with their accompanying text on the same line
  const titles: string[] = [];
  let match;
  while ((match = titleRegex.exec(text)) !== null) {
    const boldedText = match[1]; // Text inside **
    const sameLineText = match[2].trim(); // Text after ** on the same line
    
    // Combine bolded text with same-line text
    const fullTitle = sameLineText ? `${boldedText} ${sameLineText}` : boldedText;
    titles.push(fullTitle);
  }
  
  // First part is content before any title, we ignore it as per requirements
  // Start from the second part (index 1)
  for (let i = 0; i < titles.length; i++) {
    const currentTitle = titles[i];
    const currentContent = parts[i + 1]?.trim() || "";
    
    // Check if current section has no content and there's a next title
    if (currentContent === "" && i + 1 < titles.length) {
      // Group consecutive empty titles together
      let groupedTitles = [currentTitle];
      let nextIndex = i + 1;
      
      // Collect all consecutive titles with empty content
      while (nextIndex < titles.length && (parts[nextIndex + 1]?.trim() || "") === "") {
        groupedTitles.push(titles[nextIndex]);
        nextIndex++;
      }
      
      // If we found consecutive empty titles, group them with the next title that has content
      if (nextIndex < titles.length) {
        groupedTitles.push(titles[nextIndex]);
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
