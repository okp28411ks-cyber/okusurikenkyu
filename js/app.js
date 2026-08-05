const SUPABASE_URL = "https://nmstudwvvmbttfhanuyu.supabase.co";
const SUPABASE_KEY = "sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase接続準備OK");
