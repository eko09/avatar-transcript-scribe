
-- Enable RLS on the existing transcripts table and add any missing columns if needed
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow public access for now (you can restrict later)
CREATE POLICY "Anyone can insert transcripts" 
  ON public.transcripts 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can view transcripts" 
  ON public.transcripts 
  FOR SELECT 
  USING (true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_transcripts_session_timestamp 
  ON public.transcripts(session_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_transcripts_created_at 
  ON public.transcripts(created_at);
