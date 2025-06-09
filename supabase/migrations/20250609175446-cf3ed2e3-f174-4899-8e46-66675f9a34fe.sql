
-- Drop ALL existing problematic policies that try to parse UUIDs or expect folder structures
DROP POLICY IF EXISTS "Allow authenticated users to insert objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to select their own objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can access PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to pdfs bucket in their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files in pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own data files" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF uploads in root" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF downloads from root" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF updates in root" ON storage.objects;
DROP POLICY IF EXISTS "Allow PDF deletions from root" ON storage.objects;
DROP POLICY IF EXISTS "Allow data uploads in root" ON storage.objects;
DROP POLICY IF EXISTS "Allow data downloads from root" ON storage.objects;
DROP POLICY IF EXISTS "Allow data updates in root" ON storage.objects;
DROP POLICY IF EXISTS "Allow data deletions from root" ON storage.objects;

-- Create brand new simple policies for root-level file storage without any UUID parsing
CREATE POLICY "Simple PDF uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Simple PDF downloads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Simple PDF updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Simple PDF deletions"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

-- Create simple policies for data bucket
CREATE POLICY "Simple data uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Simple data downloads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Simple data updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Simple data deletions"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'data' AND auth.uid() IS NOT NULL);
