
-- Add RLS policies for existing tables that are missing them

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents table
CREATE POLICY "Users can view their own documents" 
  ON public.documents 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
  ON public.documents 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
  ON public.documents 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
  ON public.documents 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on document_regions table
ALTER TABLE public.document_regions ENABLE ROW LEVEL SECURITY;

-- Create policies for document_regions table
CREATE POLICY "Users can view their own document regions" 
  ON public.document_regions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document regions" 
  ON public.document_regions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document regions" 
  ON public.document_regions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document regions" 
  ON public.document_regions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on text_assignments table
ALTER TABLE public.text_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for text_assignments table
CREATE POLICY "Users can view their own text assignments" 
  ON public.text_assignments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own text assignments" 
  ON public.text_assignments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own text assignments" 
  ON public.text_assignments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own text assignments" 
  ON public.text_assignments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_regions_user_document ON public.document_regions(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_text_assignments_user_document ON public.text_assignments(user_id, document_id);
