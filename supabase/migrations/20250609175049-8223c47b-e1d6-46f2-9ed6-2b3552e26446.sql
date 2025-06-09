
-- Drop all existing problematic policies that may expect folder structures
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload data files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view data files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update data files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete data files" ON storage.objects;

-- Create simple policies for root-level file storage without UUID parsing
CREATE POLICY "Allow PDF uploads in root"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow PDF downloads from root"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow PDF updates in root"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow PDF deletions from root"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

-- Create simple policies for data bucket
CREATE POLICY "Allow data uploads in root"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow data downloads from root"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow data updates in root"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow data deletions from root"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);
