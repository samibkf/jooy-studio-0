
-- First, drop any existing broad-access policies on the 'pdfs' bucket
DROP POLICY IF EXISTS "Allow PDF uploads in root" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF downloads from root" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF updates in root" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF deletions from root" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PDFs" ON storage.objects;

-- Make the pdfs bucket private by updating its public setting
UPDATE storage.buckets 
SET public = false 
WHERE id = 'pdfs';

-- Create new RLS policies for user-specific file access
-- Policy 1: Allow authenticated users to VIEW/SELECT their own files
CREATE POLICY "Allow individual read access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdfs' AND 
  (
    -- Support both flat structure (documentId.pdf) and user structure (userId/documentId.pdf)
    auth.uid()::text = (string_to_array(name, '/'))[1] OR
    -- For flat files, check if user owns the document
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = replace(name, '.pdf', '') AND user_id = auth.uid()
    )
  )
);

-- Policy 2: Allow authenticated users to UPLOAD/INSERT files
CREATE POLICY "Allow individual upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdfs' AND 
  (
    -- User-specific path: userId/documentId.pdf
    auth.uid()::text = (string_to_array(name, '/'))[1] OR
    -- Flat structure allowed if user owns the document
    (
      array_length(string_to_array(name, '/'), 1) = 1 AND
      EXISTS (
        SELECT 1 FROM public.documents 
        WHERE id = replace(name, '.pdf', '') AND user_id = auth.uid()
      )
    )
  )
);

-- Policy 3: Allow authenticated users to UPDATE/REPLACE their own files
CREATE POLICY "Allow individual update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pdfs' AND 
  (
    auth.uid()::text = (string_to_array(name, '/'))[1] OR
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = replace(name, '.pdf', '') AND user_id = auth.uid()
    )
  )
);

-- Policy 4: Allow authenticated users to DELETE their own files
CREATE POLICY "Allow individual delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdfs' AND 
  (
    auth.uid()::text = (string_to_array(name, '/'))[1] OR
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = replace(name, '.pdf', '') AND user_id = auth.uid()
    )
  )
);
