
-- Phase 1: Database Schema for Credit System

-- 1. Create credit_plans table to define available plans
CREATE TABLE public.credit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  credits_included INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  duration_days INTEGER, -- NULL for perpetual/manual assignment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and set policies for credit_plans
ALTER TABLE public.credit_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view plans" ON public.credit_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin to manage plans" ON public.credit_plans FOR ALL USING (public.is_admin(auth.uid()));

-- 2. Insert the 'Creator' plan
INSERT INTO public.credit_plans (name, credits_included, price, duration_days)
VALUES ('Creator', 20, 0.00, NULL);

-- 3. Add credit-related columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN plan_id UUID REFERENCES public.credit_plans(id) ON DELETE SET NULL,
ADD COLUMN credits_remaining INTEGER NOT NULL DEFAULT 0;

-- 4. Ensure RLS is enabled on profiles and add necessary policies.
-- It's assumed some policies may exist, so we drop them first to be safe.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_admin(auth.uid()));

-- 5. Create tts_requests table
CREATE TABLE public.tts_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  requested_pages INTEGER[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, processing, completed, failed
  cost_in_credits INTEGER NOT NULL,
  extra_cost_da NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and set policies for tts_requests
ALTER TABLE public.tts_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own TTS requests" ON public.tts_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all TTS requests" ON public.tts_requests FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update TTS requests" ON public.tts_requests FOR UPDATE USING (public.is_admin(auth.uid()));

-- 6. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and set policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 7. Create admin_tasks table
CREATE TABLE public.admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tts_request_id UUID NOT NULL REFERENCES public.tts_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, assigned, completed
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- admin user id
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and set policies for admin_tasks
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tasks" ON public.admin_tasks FOR ALL USING (public.is_admin(auth.uid()));

