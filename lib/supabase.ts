
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://lktaussreukarhvbltai.supabase.co';
const supabaseKey = 'sb_publishable_VRrXBKVa4cT-4E93te6hXg_aqWeKSIJ';

export const supabase = createClient(supabaseUrl, supabaseKey);

/* 
  --- INSTRUÇÕES PARA O SUPABASE SQL EDITOR ---
  Copie o código abaixo (sem os asteriscos das bordas) e cole no SQL Editor do Supabase:

  CREATE TABLE IF NOT EXISTS categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    savings TEXT,
    is_available BOOLEAN DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'free',
    current_order JSONB
  );
*/
