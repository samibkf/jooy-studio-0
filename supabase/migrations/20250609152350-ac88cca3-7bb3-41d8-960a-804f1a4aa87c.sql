
-- Create a table to store all document texts (both assigned and unassigned)
CREATE TABLE public.document_texts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.document_texts ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own document texts
CREATE POLICY "Users can view their own document texts" 
  ON public.document_texts 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own document texts
CREATE POLICY "Users can create their own document texts" 
  ON public.document_texts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own document texts
CREATE POLICY "Users can update their own document texts" 
  ON public.document_texts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own document texts
CREATE POLICY "Users can delete their own document texts" 
  ON public.document_texts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create an index for better query performance
CREATE INDEX idx_document_texts_user_document ON public.document_texts(user_id, document_id);
