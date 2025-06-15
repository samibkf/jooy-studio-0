
ALTER TABLE public.documents
ADD COLUMN drm_protected_pages JSONB,
ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
