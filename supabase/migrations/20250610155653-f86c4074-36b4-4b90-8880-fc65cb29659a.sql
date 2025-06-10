
-- Enable RLS on text_assignments table if not already enabled
ALTER TABLE public.text_assignments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies for text_assignments to ensure clean state
DROP POLICY IF EXISTS "Admins can view all text assignments" ON public.text_assignments;
DROP POLICY IF EXISTS "Users can view their own text assignments" ON public.text_assignments;
DROP POLICY IF EXISTS "Users can create their own text assignments" ON public.text_assignments;
DROP POLICY IF EXISTS "Users can update their own text assignments" ON public.text_assignments;
DROP POLICY IF EXISTS "Users can delete their own text assignments" ON public.text_assignments;

-- Create admin policy for text_assignments table
CREATE POLICY "Admins can view all text assignments" 
  ON public.text_assignments 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- Create policies for other operations that maintain user isolation
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

-- Enable RLS on document_texts table if not already enabled  
ALTER TABLE public.document_texts ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies for document_texts to ensure clean state
DROP POLICY IF EXISTS "Admins can view all document texts" ON public.document_texts;
DROP POLICY IF EXISTS "Users can view their own document texts" ON public.document_texts;
DROP POLICY IF EXISTS "Users can create their own document texts" ON public.document_texts;
DROP POLICY IF EXISTS "Users can update their own document texts" ON public.document_texts;
DROP POLICY IF EXISTS "Users can delete their own document texts" ON public.document_texts;

-- Create admin policy for document_texts table
CREATE POLICY "Admins can view all document texts" 
  ON public.document_texts 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- Create policies for other operations that maintain user isolation
CREATE POLICY "Users can create their own document texts" 
  ON public.document_texts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document texts" 
  ON public.document_texts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document texts" 
  ON public.document_texts 
  FOR DELETE 
  USING (auth.uid() = user_id);
