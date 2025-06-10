
-- First, let's see what document IDs we have in the documents table
-- and update the text_assignments and document_texts tables to use the correct document IDs

-- Update text_assignments table to use the correct document ID from documents table
-- Assuming the document with name similar to the content should be linked
UPDATE text_assignments 
SET document_id = (
  SELECT id FROM documents 
  WHERE name ILIKE '%dzexams%' OR name ILIKE '%mathematiques%'
  LIMIT 1
)
WHERE document_id = 'RJYEN';

-- Update document_texts table to use the correct document ID from documents table  
UPDATE document_texts
SET document_id = (
  SELECT id FROM documents 
  WHERE name ILIKE '%dzexams%' OR name ILIKE '%mathematiques%'
  LIMIT 1
)
WHERE document_id = 'RJYEN';

-- Update document_regions table to ensure consistency
UPDATE document_regions
SET document_id = (
  SELECT id FROM documents 
  WHERE name ILIKE '%dzexams%' OR name ILIKE '%mathematiques%'
  LIMIT 1
)
WHERE document_id = 'RJYEN';
