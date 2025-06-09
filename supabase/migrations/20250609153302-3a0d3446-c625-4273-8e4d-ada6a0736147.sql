
-- Add page column to document_texts table to track which page each text was inserted on
ALTER TABLE public.document_texts 
ADD COLUMN page integer NOT NULL DEFAULT 1;

-- Update existing records to set page 1 as default for backward compatibility
UPDATE public.document_texts 
SET page = 1 
WHERE page IS NULL;

-- Add an index on page column for better query performance
CREATE INDEX idx_document_texts_page ON public.document_texts(document_id, page);
