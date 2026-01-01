import { createClient } from '@supabase/supabase-js';

// Your Supabase project details
const SUPABASE_URL = 'https://bkoyugjfthrenlhtfrft.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrb3l1Z2pmdGhyZW5saHRmcmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEzOTU0MjMsImV4cCI6MjA0Njk3MTQyM30.lAY4v9PnJK13g_OBRL4D6kpZA0mk4BpyzwOwoTAIOuM'; // Replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
