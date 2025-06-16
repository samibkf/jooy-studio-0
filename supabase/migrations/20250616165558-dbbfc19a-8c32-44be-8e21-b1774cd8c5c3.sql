
-- Add order_index field to document_texts table to maintain original generation order
ALTER TABLE public.document_texts 
ADD COLUMN order_index INTEGER;

-- Update existing records to have sequential order indices based on created_at
UPDATE public.document_texts 
SET order_index = subquery.row_num 
FROM (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY document_id, page 
           ORDER BY created_at
         ) as row_num
  FROM public.document_texts
) as subquery 
WHERE public.document_texts.id = subquery.id;

-- Make order_index NOT NULL after setting values for existing records
ALTER TABLE public.document_texts 
ALTER COLUMN order_index SET NOT NULL;

-- Create index for better query performance on ordering
CREATE INDEX idx_document_texts_order ON public.document_texts(document_id, page, order_index);
