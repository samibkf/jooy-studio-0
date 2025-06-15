
-- Drop the existing foreign key constraint on user_id, which is likely pointing to the wrong table.
ALTER TABLE public.tts_requests DROP CONSTRAINT tts_requests_user_id_fkey;

-- Add the correct foreign key constraint, pointing to public.profiles
ALTER TABLE public.tts_requests
ADD CONSTRAINT tts_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
