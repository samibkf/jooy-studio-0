
-- Drop all existing problematic policies that expect UUID-based folder structures
DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload data files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view data files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update data files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete data files" ON storage.objects;

-- Create simple, clean policies for the pdfs bucket that work with 5-letter IDs
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

-- Create simple, clean policies for the data bucket
CREATE POLICY "Authenticated users can upload data files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view data files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update data files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete data files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);
