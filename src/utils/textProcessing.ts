
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
  console.log('[TextProcessing] Raw input text:', text.substring(0, 200) + '...');
  
  if (!text || text.trim().length === 0) {
    console.error('[TextProcessing] Empty or invalid text provided');
    return [];
  }

  const sections: TitledText[] = [];
  
  // Try multiple markdown formats
  const formats = [
    // Format 1: **title** pattern
    {
      regex: /\*\*(.*?)\*\*/g,
      splitRegex: /\*\*.*?\*\*/
    },
    // Format 2: # Title pattern
    {
      regex: /^#+\s+(.+)$/gm,
      splitRegex: /^#+\s+.+$/gm
    },
    // Format 3: Title: pattern
    {
      regex: /^([^:\n]+):\s*$/gm,
      splitRegex: /^[^:\n]+:\s*$/gm
    }
  ];

  let parsedSections: TitledText[] = [];
  
  // Try each format until one works
  for (const format of formats) {
    try {
      const titles: string[] = [];
      let match;
      
      // Reset regex lastIndex
      format.regex.lastIndex = 0;
      
      while ((match = format.regex.exec(text)) !== null) {
        titles.push(match[1].trim());
      }
      
      if (titles.length > 0) {
        console.log(`[TextProcessing] Found ${titles.length} titles using format pattern`);
        
        // Split the text by the same pattern
        const parts = text.split(format.splitRegex);
        
        // Process sections
        for (let i = 0; i < titles.length; i++) {
          const currentTitle = titles[i];
          const currentContent = parts[i + 1]?.trim() || "";
          
          // Handle empty content sections
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
              
              parsedSections.push({
                title: combinedTitle,
                content: finalContent
              });
              
              // Skip the processed titles
              i = nextIndex;
            } else {
              // If no title with content follows, just add the empty title
              parsedSections.push({
                title: currentTitle,
                content: currentContent
              });
            }
          } else {
            // Normal case: title with content
            parsedSections.push({
              title: currentTitle,
              content: currentContent
            });
          }
        }
        
        if (parsedSections.length > 0) {
          console.log(`[TextProcessing] Successfully parsed ${parsedSections.length} sections`);
          return parsedSections;
        }
      }
    } catch (error) {
      console.warn(`[TextProcessing] Format parsing failed:`, error);
      continue;
    }
  }
  
  // Fallback: Try to parse as plain text with double line breaks
  console.log('[TextProcessing] Trying fallback parsing with line breaks');
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length > 1) {
    parsedSections = paragraphs.map((paragraph, index) => {
      const lines = paragraph.trim().split('\n');
      const firstLine = lines[0].trim();
      const restContent = lines.slice(1).join('\n').trim();
      
      return {
        title: firstLine || `Section ${index + 1}`,
        content: restContent || firstLine
      };
    });
    
    console.log(`[TextProcessing] Fallback parsing created ${parsedSections.length} sections`);
    return parsedSections;
  }
  
  // Last resort: Create a single section
  if (text.trim().length > 0) {
    const lines = text.trim().split('\n');
    const title = lines[0].trim() || 'Generated Content';
    const content = lines.length > 1 ? lines.slice(1).join('\n').trim() : text.trim();
    
    parsedSections = [{
      title: title,
      content: content
    }];
    
    console.log('[TextProcessing] Created single section as last resort');
    return parsedSections;
  }
  
  console.error('[TextProcessing] All parsing methods failed');
  return [];
};

/**
 * Format content with proper markdown formatting
 */
export const formatContent = (content: string): string => {
  return content.trim();
};
