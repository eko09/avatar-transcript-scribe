
-- Remove the check constraint that's preventing transcripts from being saved
ALTER TABLE public.transcripts DROP CONSTRAINT IF EXISTS transcripts_speaker_check;
