
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://lktaussreukarhvbltai.supabase.co';
const supabaseKey = 'sb_publishable_VRrXBKVa4cT-4E93te6hXg_aqWeKSIJ';

// Cliente Supabase configurado para o projeto D.Moreira
export const supabase = createClient(supabaseUrl, supabaseKey);
