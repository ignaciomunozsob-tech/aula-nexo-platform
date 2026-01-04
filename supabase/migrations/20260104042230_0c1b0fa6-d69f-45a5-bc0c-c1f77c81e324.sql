-- Add format column to courses table
ALTER TABLE public.courses 
ADD COLUMN format text NOT NULL DEFAULT 'recorded';

-- Add comment for documentation
COMMENT ON COLUMN public.courses.format IS 'Course format: recorded, live, or hybrid';