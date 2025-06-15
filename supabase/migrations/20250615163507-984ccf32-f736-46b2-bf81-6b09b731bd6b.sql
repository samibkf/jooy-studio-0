
-- Add the column to link texts to regions
ALTER TABLE public.document_texts
ADD COLUMN assigned_region_id UUID;

-- Add a foreign key to ensure data integrity.
-- If a region is deleted, the assignment will be removed (set to NULL).
ALTER TABLE public.document_texts
ADD CONSTRAINT fk_document_regions
FOREIGN KEY (assigned_region_id)
REFERENCES public.document_regions(id)
ON DELETE SET NULL;
