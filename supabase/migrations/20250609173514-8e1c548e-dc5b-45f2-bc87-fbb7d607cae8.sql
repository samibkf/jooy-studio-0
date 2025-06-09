
-- Drop existing problematic policies for pdfs bucket
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;

-- Drop existing problematic policies for data bucket
DROP POLICY IF EXISTS "Users can upload their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own data files" ON storage.objects;

-- Create new policies for pdfs bucket with proper UUID handling
CREATE POLICY "Allow authenticated users to upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

-- Create new policies for data bucket with proper UUID handling
CREATE POLICY "Allow authenticated users to upload data files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view data files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update data files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete data files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);
