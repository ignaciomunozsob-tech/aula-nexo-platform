-- Create app_role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('student', 'creator', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  role public.app_role NOT NULL DEFAULT 'student',
  creator_slug TEXT UNIQUE,
  bio TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  price_clp INTEGER NOT NULL DEFAULT 0,
  level TEXT DEFAULT 'beginner',
  duration_minutes_est INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_modules table
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'text')),
  video_url TEXT,
  content_text TEXT,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lesson_resources table
CREATE TABLE public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'refunded', 'cancelled')),
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(enrollment_id, lesson_id)
);

-- Create page_views table for analytics
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('creator_profile', 'course')),
  ref_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_courses_creator ON public.courses(creator_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id);
CREATE INDEX idx_lessons_module ON public.lessons(module_id);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_page_views_type_ref ON public.page_views(type, ref_id);
CREATE INDEX idx_page_views_created ON public.page_views(created_at);
CREATE INDEX idx_profiles_creator_slug ON public.profiles(creator_slug);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for secure role checking
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Function to check if user is course creator
CREATE OR REPLACE FUNCTION public.is_course_creator(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = _course_id AND creator_id = _user_id
  )
$$;

-- Function to check if user has active enrollment
CREATE OR REPLACE FUNCTION public.has_active_enrollment(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id AND course_id = _course_id AND status = 'active'
  )
$$;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Categories policies (public read)
CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

-- Courses policies
CREATE POLICY "Published courses are viewable by everyone"
ON public.courses FOR SELECT
USING (status = 'published' OR creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can insert own courses"
ON public.courses FOR INSERT
WITH CHECK (
  creator_id = auth.uid() AND 
  (public.get_user_role(auth.uid()) = 'creator' OR public.get_user_role(auth.uid()) = 'admin')
);

CREATE POLICY "Creators can update own courses"
ON public.courses FOR UPDATE
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can delete own courses"
ON public.courses FOR DELETE
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- Course modules policies
CREATE POLICY "Modules viewable if course is published or user is creator/enrolled"
ON public.course_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id 
    AND (c.status = 'published' OR c.creator_id = auth.uid())
  ) OR public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Creators can manage modules of own courses"
ON public.course_modules FOR INSERT
WITH CHECK (public.is_course_creator(auth.uid(), course_id));

CREATE POLICY "Creators can update modules of own courses"
ON public.course_modules FOR UPDATE
USING (public.is_course_creator(auth.uid(), course_id));

CREATE POLICY "Creators can delete modules of own courses"
ON public.course_modules FOR DELETE
USING (public.is_course_creator(auth.uid(), course_id));

-- Lessons policies
CREATE POLICY "Lessons viewable if enrolled or creator"
ON public.lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id
    AND (
      c.creator_id = auth.uid() 
      OR public.has_active_enrollment(auth.uid(), c.id)
      OR public.get_user_role(auth.uid()) = 'admin'
    )
  )
);

CREATE POLICY "Creators can manage lessons"
ON public.lessons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can update lessons"
ON public.lessons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can delete lessons"
ON public.lessons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.creator_id = auth.uid()
  )
);

-- Lesson resources policies
CREATE POLICY "Resources viewable if lesson is viewable"
ON public.lesson_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_id
    AND (
      c.creator_id = auth.uid() 
      OR public.has_active_enrollment(auth.uid(), c.id)
      OR public.get_user_role(auth.uid()) = 'admin'
    )
  )
);

CREATE POLICY "Creators can manage resources"
ON public.lesson_resources FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_id AND c.creator_id = auth.uid()
  )
);

-- Enrollments policies
CREATE POLICY "Users can view own enrollments"
ON public.enrollments FOR SELECT
USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can view enrollments for own courses"
ON public.enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can create own enrollments"
ON public.enrollments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own enrollments"
ON public.enrollments FOR UPDATE
USING (user_id = auth.uid());

-- Lesson progress policies
CREATE POLICY "Users can view own progress"
ON public.lesson_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e 
    WHERE e.id = enrollment_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own progress"
ON public.lesson_progress FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e 
    WHERE e.id = enrollment_id AND e.user_id = auth.uid()
  )
);

-- Page views policies
CREATE POLICY "Anyone can insert page views"
ON public.page_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Creators can view analytics for own content"
ON public.page_views FOR SELECT
USING (
  (type = 'creator_profile' AND ref_id = auth.uid())
  OR (type = 'course' AND public.is_course_creator(auth.uid(), ref_id))
  OR public.get_user_role(auth.uid()) = 'admin'
);

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student')
  );
  
  -- Also insert into user_roles for the has_role function
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, slug) VALUES
  ('Desarrollo Web', 'desarrollo-web'),
  ('Marketing Digital', 'marketing-digital'),
  ('Diseño', 'diseno'),
  ('Negocios', 'negocios'),
  ('Fotografía', 'fotografia'),
  ('Música', 'musica'),
  ('Idiomas', 'idiomas'),
  ('Desarrollo Personal', 'desarrollo-personal');

-- Create storage bucket for course assets
INSERT INTO storage.buckets (id, name, public) VALUES ('course-assets', 'course-assets', true);

-- Storage policies for course assets
CREATE POLICY "Anyone can view course assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-assets');

CREATE POLICY "Authenticated users can upload course assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-assets' AND auth.uid()::text = (storage.foldername(name))[1]);