-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('planner', 'student');
CREATE TYPE homework_status AS ENUM ('pending', 'submitted', 'reviewed', 'completed');
CREATE TYPE submission_type AS ENUM ('text', 'audio', 'video', 'file');
CREATE TYPE notification_type AS ENUM ('homework_assigned', 'homework_submitted', 'feedback_received', 'message', 'system');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planner profiles (additional info for planners)
CREATE TABLE public.planner_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio TEXT,
    specialization TEXT[],
    years_of_experience INTEGER,
    rating DECIMAL(3,2),
    total_students INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student profiles (additional info for students)
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    planner_id UUID REFERENCES public.profiles(id),
    level TEXT,
    learning_goals TEXT[],
    preferred_learning_style TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes/Groups
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    schedule JSONB, -- Store recurring schedule info
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class enrollments
CREATE TABLE public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(class_id, student_id)
);

-- Lessons
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    content JSONB, -- Store lesson materials, links, etc.
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework assignments
CREATE TABLE public.homework (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lessons(id),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    resources JSONB, -- Links, files, etc.
    due_date TIMESTAMPTZ,
    estimated_time_minutes INTEGER,
    max_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework assignments to students (many-to-many)
CREATE TABLE public.homework_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status homework_status DEFAULT 'pending',
    UNIQUE(homework_id, student_id)
);

-- Homework submissions
CREATE TABLE public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    submission_type submission_type NOT NULL,
    content TEXT, -- For text submissions
    file_url TEXT, -- For file/audio/video submissions
    metadata JSONB, -- Additional data like duration, file size, etc.
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback on submissions
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.homework_submissions(id),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    score INTEGER,
    comments TEXT,
    audio_feedback_url TEXT,
    strengths TEXT[],
    areas_for_improvement TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages/Chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    receiver_id UUID REFERENCES public.profiles(id), -- NULL for group messages
    class_id UUID REFERENCES public.classes(id), -- For class-wide messages
    content TEXT NOT NULL,
    attachments JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB, -- Additional context data
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning progress tracking
CREATE TABLE public.progress_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    lesson_id UUID REFERENCES public.lessons(id),
    homework_id UUID REFERENCES public.homework(id),
    skill_area TEXT,
    score DECIMAL(5,2),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study materials/Resources
CREATE TABLE public.study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT, -- 'document', 'video', 'audio', 'link'
    file_url TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material access permissions
CREATE TABLE public.material_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id),
    student_id UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, class_id, student_id)
);

-- Attendance records
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    is_present BOOLEAN DEFAULT false,
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_student_profiles_planner ON public.student_profiles(planner_id);
CREATE INDEX idx_classes_planner ON public.classes(planner_id);
CREATE INDEX idx_homework_planner ON public.homework(planner_id);
CREATE INDEX idx_homework_due_date ON public.homework(due_date);
CREATE INDEX idx_homework_assignments_student ON public.homework_assignments(student_id);
CREATE INDEX idx_homework_assignments_status ON public.homework_assignments(status);
CREATE INDEX idx_submissions_student ON public.homework_submissions(student_id);
CREATE INDEX idx_feedback_submission ON public.feedback(submission_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_progress_student ON public.progress_tracking(student_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Planners can view student profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = profiles.id
            AND sp.planner_id = auth.uid()
        )
    );

-- Classes policies
CREATE POLICY "Planners can manage their own classes" ON public.classes
    FOR ALL USING (planner_id = auth.uid());

CREATE POLICY "Students can view their enrolled classes" ON public.classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_enrollments ce
            WHERE ce.class_id = classes.id
            AND ce.student_id = auth.uid()
        )
    );

-- Homework policies
CREATE POLICY "Planners can manage their homework" ON public.homework
    FOR ALL USING (planner_id = auth.uid());

CREATE POLICY "Students can view assigned homework" ON public.homework
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.homework_assignments ha
            WHERE ha.homework_id = homework.id
            AND ha.student_id = auth.uid()
        )
    );

-- Submissions policies
CREATE POLICY "Students can manage their submissions" ON public.homework_submissions
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Planners can view student submissions" ON public.homework_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.homework_assignments ha
            JOIN public.homework h ON ha.homework_id = h.id
            WHERE ha.id = homework_submissions.assignment_id
            AND h.planner_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages
    FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Create functions for common operations

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planner_profiles_updated_at BEFORE UPDATE ON public.planner_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.homework_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.study_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();