
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://lktaussreukarhvbltai.supabase.co';
const supabaseKey = 'sb_publishable_VRrXBKVa4cT-4E93te6hXg_aqWeKSIJ';

// Cliente Supabase configurado para o projeto D.Moreira
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * IMPORTANTE:
 * Se você vir o erro "relation products does not exist", 
 * vá no seu painel do Supabase -> SQL Editor -> Novo SQL 
 * e cole o script de criação de tabelas fornecido pelo assistente.
 */
