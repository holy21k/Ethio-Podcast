// 🗄️ Supabase Configuration for Profile Photo Storage
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// 👉 TODO: Replace with your Supabase credentials
// Get these from: https://supabase.com/dashboard/project/_/settings/api

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfqtrfvfudlkerbmidhm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcXRyZnZmdWRsa2VyYm1pZGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTI2OTUsImV4cCI6MjA4ODM4ODY5NX0.qP65eqR1AlLhFNZV2lssvOOGEiczVIAbAAIJ-05aBB0';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = { supabase };
