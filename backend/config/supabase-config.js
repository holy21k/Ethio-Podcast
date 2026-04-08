const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ✅ Crash loud and early if Supabase env vars are missing
// This will appear clearly in Vercel function logs
if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL is missing! Go to Vercel → Settings → Environment Variables and add it.');
}
if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY is missing! Go to Vercel → Settings → Environment Variables and add it.');
    console.error('   ⚠️  Make sure you use the SERVICE ROLE key, NOT the anon/public key.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = { supabase };
