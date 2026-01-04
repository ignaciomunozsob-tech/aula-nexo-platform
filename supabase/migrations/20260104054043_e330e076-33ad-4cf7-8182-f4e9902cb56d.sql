-- Create student_creation_logs table for rate limiting
CREATE TABLE public.student_creation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  students_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_student_creation_logs_creator_created 
ON public.student_creation_logs(creator_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.student_creation_logs ENABLE ROW LEVEL SECURITY;

-- Creators can only view their own logs
CREATE POLICY "Creators can view own logs" 
ON public.student_creation_logs 
FOR SELECT 
USING (creator_id = auth.uid());

-- Service role can insert (from edge function)
-- No INSERT policy needed as edge function uses service role