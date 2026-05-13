CREATE TABLE IF NOT EXISTS public.saved_trips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  city text,
  events jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trips" ON public.saved_trips
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
