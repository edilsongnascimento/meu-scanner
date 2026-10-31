import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ikqntbluzfrdshembpkx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jseti26xoumixL5H0p4Fpw_GlKD_Txm";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);